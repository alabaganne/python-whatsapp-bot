import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { processWhatsAppMessage } from "@/lib/services/whatsapp/message-processor";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET!;

// Webhook verification (GET request from WhatsApp)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.log("VERIFICATION_FAILED");
      return new NextResponse("Verification failed", { status: 403 });
    }
  } else {
    console.log("MISSING_PARAMETER");
    return new NextResponse("Missing parameters", { status: 400 });
  }
}

// Verify WhatsApp signature
function verifySignature(payload: string, signature: string): boolean {
  if (!APP_SECRET || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", APP_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

// Webhook handler (POST request from WhatsApp)
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256") || "";

    // Verify signature
    if (!verifySignature(rawBody, signature)) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("Request body:", body);

    // Check for WhatsApp status update
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (value?.statuses) {
      console.log("Received a WhatsApp status update.");

      // Check for failed message delivery status
      for (const status of value.statuses) {
        if (status.status === "failed") {
          console.warn("WhatsApp message delivery failed:", status);
        }
      }

      return NextResponse.json({ status: "ok" });
    }

    // Process message if it's a valid WhatsApp message
    if (isValidWhatsAppMessage(body)) {
      const message = value?.messages?.[0];
      const senderId = message?.from;

      // Check if customer is blocked
      if (senderId) {
        const supabase = createServiceClient();
        const { data: customer } = await supabase
          .from("customers")
          .select("is_blocked")
          .eq("wa_id", senderId)
          .single();

        if (customer?.is_blocked) {
          console.log("Ignoring incoming message from blocked contact", senderId);
          return NextResponse.json({ status: "ok", ignored: true });
        }
      }

      // Queue the message for processing
      await queueMessage(body);

      return NextResponse.json({ status: "ok" });
    } else {
      console.warn("Unknown webhook payload structure:", body);
      return NextResponse.json({ status: "unknown" });
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

function isValidWhatsAppMessage(body: any): boolean {
  return (
    body?.entry?.[0]?.changes?.[0]?.value?.messages &&
    Array.isArray(body.entry[0].changes[0].value.messages) &&
    body.entry[0].changes[0].value.messages.length > 0
  );
}

async function queueMessage(body: any) {
  const supabase = createServiceClient();
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const messageId = message?.id;
  const waId = message?.from;

  try {
    await supabase.from("inbound_message_queue").insert({
      message_id: messageId,
      wa_id: waId,
      payload: JSON.stringify(body),
      status: "pending",
      attempts: 0,
    });

    // Start processing in the background (non-blocking)
    processWhatsAppMessage(body).catch((error) => {
      console.error("Error in background message processing:", error);
    });
  } catch (error) {
    console.error("Error queuing message:", error);
    throw error;
  }
}
