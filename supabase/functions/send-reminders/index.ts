/**
 * Supabase Edge Function: Send Reminders
 * Sends WhatsApp reminders for tomorrow's appointments
 * Triggered daily via cron job
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Reservation {
  id: number;
  wa_id: string;
  date: string;
  time_slot: string;
  type: number;
}

interface Customer {
  wa_id: string;
  customer_name: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];

    console.log(`Fetching reservations for ${tomorrowDate}`);

    // Fetch all active reservations for tomorrow
    const { data: reservations, error: reservationsError } =
      await supabaseClient
        .from("reservations")
        .select("id, wa_id, date, time_slot, type")
        .eq("date", tomorrowDate)
        .eq("status", "active");

    if (reservationsError) {
      throw reservationsError;
    }

    if (!reservations || reservations.length === 0) {
      console.log("No reservations found for tomorrow");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No reservations for tomorrow",
          count: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`Found ${reservations.length} reservations`);

    // Send reminders
    const results = [];
    for (const reservation of reservations as Reservation[]) {
      try {
        // Get customer info
        const { data: customer } = await supabaseClient
          .from("customers")
          .select("wa_id, customer_name")
          .eq("wa_id", reservation.wa_id)
          .single();

        if (!customer) {
          console.error(`Customer not found: ${reservation.wa_id}`);
          continue;
        }

        // Send WhatsApp template message
        const sent = await sendReminderMessage(
          reservation,
          customer as Customer
        );

        if (sent) {
          // Log message in conversation
          await supabaseClient.from("conversation").insert({
            wa_id: reservation.wa_id,
            role: "secretary",
            message: `تذكير: لديك موعد غداً ${reservation.date} الساعة ${reservation.time_slot}`,
            date: new Date().toISOString().split("T")[0],
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          });

          results.push({
            wa_id: reservation.wa_id,
            success: true,
          });
        }
      } catch (error) {
        console.error(
          `Error sending reminder to ${reservation.wa_id}:`,
          error
        );
        results.push({
          wa_id: reservation.wa_id,
          success: false,
          error: String(error),
        });
      }
    }

    console.log(`Sent ${results.filter((r) => r.success).length} reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Reminders sent",
        total: reservations.length,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-reminders function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function sendReminderMessage(
  reservation: Reservation,
  customer: Customer
): Promise<boolean> {
  const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const VERSION = Deno.env.get("WHATSAPP_API_VERSION") || "v21.0";

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("WhatsApp credentials not configured");
    return false;
  }

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: customer.wa_id,
        type: "template",
        template: {
          name: "appointment_reminder",
          language: {
            code: "ar",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: customer.customer_name || "عزيزي المريض",
                },
                {
                  type: "text",
                  text: reservation.date,
                },
                {
                  type: "text",
                  text: reservation.time_slot,
                },
              ],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}
