import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTemplate } from "@/lib/services/whatsapp/client";

// This endpoint is called by Vercel Cron Jobs
// https://vercel.com/docs/cron-jobs
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];

    // Fetch all active reservations for tomorrow
    const { data: reservations, error: reservationsError } = await supabase
      .from("reservations")
      .select("id, wa_id, date, time_slot, type")
      .eq("date", tomorrowDate)
      .eq("status", "active");

    if (reservationsError) {
      throw reservationsError;
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No reservations for tomorrow",
        count: 0,
      });
    }

    // Send reminders
    const results = [];
    for (const reservation of reservations) {
      try {
        // Get customer info
        const { data: customer } = await supabase
          .from("customers")
          .select("wa_id, customer_name")
          .eq("wa_id", reservation.wa_id)
          .single();

        if (!customer) {
          console.error(`Customer not found: ${reservation.wa_id}`);
          continue;
        }

        // Send WhatsApp template message
        await sendTemplate(
          customer.wa_id,
          "appointment_reminder",
          "ar",
          [
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
          ]
        );

        // Log message in conversation
        await supabase.from("conversation").insert({
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
      } catch (error) {
        console.error(`Error sending reminder to ${reservation.wa_id}:`, error);
        results.push({
          wa_id: reservation.wa_id,
          success: false,
          error: String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reminders sent",
      total: reservations.length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    console.error("Error in send-reminders cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
