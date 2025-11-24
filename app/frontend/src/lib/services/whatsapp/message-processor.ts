/**
 * WhatsApp Message Processor
 * Handles incoming WhatsApp messages and coordinates AI responses
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getLLMService } from "@/lib/services/ai/llm-service";
import {
  sendTextMessage,
  sendTypingIndicator,
  markMessageAsRead,
} from "./client";
import { reservationTools, executeReservationTool } from "@/lib/services/tools/reservation-tools";

const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  `You are an AI assistant for a medical clinic. You help patients with:
- Booking appointments (حجز موعد)
- Modifying existing appointments (تعديل موعد)
- Canceling appointments (إلغاء موعد)

Respond in Arabic when the user speaks Arabic, and in English when they speak English.
Be professional, friendly, and helpful.`;

export async function processWhatsAppMessage(body: any) {
  const supabase = createServiceClient();

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      console.log("No message found in webhook payload");
      return;
    }

    const messageId = message.id;
    const from = message.from; // WhatsApp ID
    const messageType = message.type;

    // Mark message as read
    await markMessageAsRead(messageId);

    // Get message text
    let messageText = "";
    if (messageType === "text") {
      messageText = message.text?.body || "";
    } else if (messageType === "interactive") {
      // Handle button responses or list selections
      const interactive = message.interactive;
      if (interactive.type === "button_reply") {
        messageText = interactive.button_reply.title;
      } else if (interactive.type === "list_reply") {
        messageText = interactive.list_reply.title;
      }
    } else {
      // Unsupported message type
      await sendTextMessage(
        from,
        "عذراً، أستطيع فقط معالجة الرسائل النصية. | Sorry, I can only process text messages."
      );
      return;
    }

    if (!messageText || messageText.length === 0) {
      return;
    }

    // Check message length limit
    if (messageText.length > 4096) {
      await sendTextMessage(
        from,
        "الرسالة طويلة جداً. يرجى إرسال رسالة أقصر. | Message too long. Please send a shorter message."
      );
      return;
    }

    // Get or create customer
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("wa_id", from)
      .single();

    if (!customer) {
      // Create new customer
      await supabase.from("customers").insert({
        wa_id: from,
        customer_name: value.contacts?.[0]?.profile?.name || null,
      });
    }

    // Get conversation history
    const { data: conversationHistory } = await supabase
      .from("conversation")
      .select("*")
      .eq("wa_id", from)
      .order("id", { ascending: true })
      .limit(50);

    // Save user message
    await supabase.from("conversation").insert({
      wa_id: from,
      role: "user",
      message: messageText,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    });

    // Send typing indicator
    await sendTypingIndicator(from);

    // Prepare messages for LLM
    const messages = [
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.message,
      })),
      {
        role: "user" as const,
        content: messageText,
      },
    ];

    // Get LLM response
    const llmService = getLLMService();
    const response = await llmService.run(messages, reservationTools, SYSTEM_PROMPT);

    // Handle tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        try {
          await executeReservationTool(toolCall.name, toolCall.arguments, from);
        } catch (error) {
          console.error(`Error executing tool ${toolCall.name}:`, error);
        }
      }
    }

    // Send AI response
    if (response.message && response.message.trim().length > 0) {
      await sendTextMessage(from, response.message);

      // Save assistant message
      await supabase.from("conversation").insert({
        wa_id: from,
        role: "assistant",
        message: response.message,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      });
    }

    // Broadcast notification event
    await supabase.from("notification_events").insert({
      event_type: "message_received",
      ts_iso: new Date().toISOString(),
      data: JSON.stringify({
        wa_id: from,
        message: messageText,
      }),
    });
  } catch (error) {
    console.error("Error processing WhatsApp message:", error);
    throw error;
  }
}
