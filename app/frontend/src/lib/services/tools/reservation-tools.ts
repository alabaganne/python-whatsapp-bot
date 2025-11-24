/**
 * Reservation Tools - Function calling tools for AI to manage reservations
 */

import { createServiceClient } from "@/lib/supabase/server";
import { sendTextMessage } from "../whatsapp/client";

export const reservationTools = [
  {
    name: "reserve_time_slot",
    description: "Reserve a time slot for a patient. Use this when a patient wants to book an appointment.",
    input_schema: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "Patient's full name in Arabic or English",
        },
        age: {
          type: "number",
          description: "Patient's age in years",
        },
        date: {
          type: "string",
          description: "Appointment date in YYYY-MM-DD format",
        },
        time_slot: {
          type: "string",
          description: 'Time slot in "HH:MM AM/PM" format (e.g., "03:30 PM")',
        },
        reservation_type: {
          type: "number",
          description: "0 for check-up (كشف), 1 for follow-up (متابعة)",
          enum: [0, 1],
        },
      },
      required: ["customer_name", "date", "time_slot", "reservation_type"],
    },
  },
  {
    name: "cancel_reservation",
    description: "Cancel an existing reservation for a patient",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Reservation date in YYYY-MM-DD format",
        },
        time_slot: {
          type: "string",
          description: 'Time slot in "HH:MM AM/PM" format',
        },
      },
      required: ["date", "time_slot"],
    },
  },
  {
    name: "modify_reservation",
    description: "Modify an existing reservation's date or time",
    input_schema: {
      type: "object",
      properties: {
        old_date: {
          type: "string",
          description: "Current reservation date in YYYY-MM-DD format",
        },
        old_time_slot: {
          type: "string",
          description: 'Current time slot in "HH:MM AM/PM" format',
        },
        new_date: {
          type: "string",
          description: "New reservation date in YYYY-MM-DD format",
        },
        new_time_slot: {
          type: "string",
          description: 'New time slot in "HH:MM AM/PM" format',
        },
      },
      required: ["old_date", "old_time_slot", "new_date", "new_time_slot"],
    },
  },
  {
    name: "check_availability",
    description: "Check available time slots for a specific date",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to check in YYYY-MM-DD format",
        },
      },
      required: ["date"],
    },
  },
];

export async function executeReservationTool(
  toolName: string,
  args: Record<string, any>,
  waId: string
) {
  const supabase = createServiceClient();

  switch (toolName) {
    case "reserve_time_slot":
      return await reserveTimeSlot(args, waId);

    case "cancel_reservation":
      return await cancelReservation(args, waId);

    case "modify_reservation":
      return await modifyReservation(args, waId);

    case "check_availability":
      return await checkAvailability(args);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function reserveTimeSlot(args: Record<string, any>, waId: string) {
  const supabase = createServiceClient();
  const { customer_name, age, date, time_slot, reservation_type } = args;

  try {
    // Update customer info if provided
    if (customer_name || age) {
      const updateData: any = {};
      if (customer_name) updateData.customer_name = customer_name;
      if (age) {
        updateData.age = age;
        updateData.age_recorded_at = new Date().toISOString().split("T")[0];
      }

      await supabase
        .from("customers")
        .update(updateData)
        .eq("wa_id", waId);
    }

    // Check if slot is available
    const { data: existingReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", date)
      .eq("time_slot", time_slot)
      .eq("status", "active");

    // Get max capacity from config (default: 1)
    const maxCapacity = 1; // TODO: Get from app_config

    if (existingReservations && existingReservations.length >= maxCapacity) {
      await sendTextMessage(
        waId,
        `عذراً، الموعد في ${date} الساعة ${time_slot} محجوز بالكامل. | Sorry, the slot at ${date} ${time_slot} is fully booked.`
      );
      return { success: false, reason: "Slot fully booked" };
    }

    // Create reservation
    const { error } = await supabase.from("reservations").insert({
      wa_id: waId,
      date,
      time_slot,
      type: reservation_type,
      status: "active",
    });

    if (error) {
      console.error("Error creating reservation:", error);
      await sendTextMessage(
        waId,
        "عذراً، حدث خطأ أثناء الحجز. | Sorry, an error occurred while booking."
      );
      return { success: false, error };
    }

    // Broadcast notification
    await supabase.from("notification_events").insert({
      event_type: "reservation_created",
      ts_iso: new Date().toISOString(),
      data: JSON.stringify({ wa_id: waId, date, time_slot }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error in reserveTimeSlot:", error);
    throw error;
  }
}

async function cancelReservation(args: Record<string, any>, waId: string) {
  const supabase = createServiceClient();
  const { date, time_slot } = args;

  try {
    // Find and cancel the reservation
    const { data: reservation } = await supabase
      .from("reservations")
      .select("*")
      .eq("wa_id", waId)
      .eq("date", date)
      .eq("time_slot", time_slot)
      .eq("status", "active")
      .single();

    if (!reservation) {
      await sendTextMessage(
        waId,
        `لم يتم العثور على حجز نشط في ${date} الساعة ${time_slot}. | No active reservation found at ${date} ${time_slot}.`
      );
      return { success: false, reason: "Reservation not found" };
    }

    // Update reservation status
    const { error } = await supabase
      .from("reservations")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", reservation.id);

    if (error) {
      console.error("Error canceling reservation:", error);
      await sendTextMessage(
        waId,
        "عذراً، حدث خطأ أثناء الإلغاء. | Sorry, an error occurred while canceling."
      );
      return { success: false, error };
    }

    // Broadcast notification
    await supabase.from("notification_events").insert({
      event_type: "reservation_cancelled",
      ts_iso: new Date().toISOString(),
      data: JSON.stringify({ wa_id: waId, date, time_slot }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error in cancelReservation:", error);
    throw error;
  }
}

async function modifyReservation(args: Record<string, any>, waId: string) {
  const supabase = createServiceClient();
  const { old_date, old_time_slot, new_date, new_time_slot } = args;

  try {
    // Find existing reservation
    const { data: reservation } = await supabase
      .from("reservations")
      .select("*")
      .eq("wa_id", waId)
      .eq("date", old_date)
      .eq("time_slot", old_time_slot)
      .eq("status", "active")
      .single();

    if (!reservation) {
      await sendTextMessage(
        waId,
        `لم يتم العثور على حجز نشط في ${old_date} الساعة ${old_time_slot}. | No active reservation found at ${old_date} ${old_time_slot}.`
      );
      return { success: false, reason: "Reservation not found" };
    }

    // Check if new slot is available
    const { data: existingReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", new_date)
      .eq("time_slot", new_time_slot)
      .eq("status", "active");

    const maxCapacity = 1; // TODO: Get from app_config

    if (existingReservations && existingReservations.length >= maxCapacity) {
      await sendTextMessage(
        waId,
        `عذراً، الموعد الجديد في ${new_date} الساعة ${new_time_slot} محجوز بالكامل. | Sorry, the new slot at ${new_date} ${new_time_slot} is fully booked.`
      );
      return { success: false, reason: "New slot fully booked" };
    }

    // Update reservation
    const { error } = await supabase
      .from("reservations")
      .update({
        date: new_date,
        time_slot: new_time_slot,
      })
      .eq("id", reservation.id);

    if (error) {
      console.error("Error modifying reservation:", error);
      await sendTextMessage(
        waId,
        "عذراً، حدث خطأ أثناء التعديل. | Sorry, an error occurred while modifying."
      );
      return { success: false, error };
    }

    // Broadcast notification
    await supabase.from("notification_events").insert({
      event_type: "reservation_modified",
      ts_iso: new Date().toISOString(),
      data: JSON.stringify({
        wa_id: waId,
        old_date,
        old_time_slot,
        new_date,
        new_time_slot,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error in modifyReservation:", error);
    throw error;
  }
}

async function checkAvailability(args: Record<string, any>) {
  const supabase = createServiceClient();
  const { date } = args;

  try {
    // Get all reservations for the date
    const { data: reservations } = await supabase
      .from("reservations")
      .select("time_slot")
      .eq("date", date)
      .eq("status", "active");

    // TODO: Get working hours and slot duration from config
    // For now, return the booked slots
    const bookedSlots = reservations?.map((r) => r.time_slot) || [];

    return {
      success: true,
      date,
      booked_slots: bookedSlots,
    };
  } catch (error) {
    console.error("Error in checkAvailability:", error);
    throw error;
  }
}
