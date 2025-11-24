/**
 * Supabase Realtime integration
 * Replaces WebSocket with Supabase Realtime subscriptions
 */

"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";
import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];
type TableName = keyof Tables;

export function useRealtimeSubscription<T extends TableName>(
  table: T,
  callback: (payload: RealtimePostgresChangesPayload<Tables[T]["Row"]>) => void,
  filter?: { column: string; value: any }
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    let subscription: RealtimeChannel;

    if (filter) {
      subscription = supabase
        .channel(`${table}_changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table as string,
            filter: `${filter.column}=eq.${filter.value}`,
          },
          callback as any
        )
        .subscribe();
    } else {
      subscription = supabase
        .channel(`${table}_changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table as string,
          },
          callback as any
        )
        .subscribe();
    }

    setChannel(subscription);

    return () => {
      subscription.unsubscribe();
    };
  }, [table, filter?.column, filter?.value, supabase, callback]);

  return channel;
}

// Specific hooks for common use cases
export function useReservationUpdates(
  callback: (payload: RealtimePostgresChangesPayload<Tables["reservations"]["Row"]>) => void
) {
  return useRealtimeSubscription("reservations", callback);
}

export function useCustomerUpdates(
  waId?: string,
  callback?: (payload: RealtimePostgresChangesPayload<Tables["customers"]["Row"]>) => void
) {
  const defaultCallback = useCallback((payload: any) => {
    console.log("Customer updated:", payload);
  }, []);

  return useRealtimeSubscription(
    "customers",
    callback || defaultCallback,
    waId ? { column: "wa_id", value: waId } : undefined
  );
}

export function useConversationUpdates(
  waId: string,
  callback: (payload: RealtimePostgresChangesPayload<Tables["conversation"]["Row"]>) => void
) {
  return useRealtimeSubscription("conversation", callback, {
    column: "wa_id",
    value: waId,
  });
}

export function useNotificationEvents(
  callback: (payload: RealtimePostgresChangesPayload<Tables["notification_events"]["Row"]>) => void
) {
  return useRealtimeSubscription("notification_events", callback);
}

// Broadcast channel for app-wide notifications
export function useBroadcastChannel(
  channelName: string,
  eventName: string,
  callback: (payload: any) => void
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const subscription = supabase
      .channel(channelName)
      .on("broadcast", { event: eventName }, callback)
      .subscribe();

    setChannel(subscription);

    return () => {
      subscription.unsubscribe();
    };
  }, [channelName, eventName, supabase, callback]);

  const broadcast = (payload: any) => {
    if (channel) {
      channel.send({
        type: "broadcast",
        event: eventName,
        payload,
      });
    }
  };

  return { channel, broadcast };
}

// Helper to avoid multiple imports
function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return callback;
}
