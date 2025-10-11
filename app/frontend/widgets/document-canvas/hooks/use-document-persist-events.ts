"use client";

import { useEffect, useRef } from "react";
import { persistCustomerRow } from "@/processes/documents/customer-persist.process";
import type { IDataSource } from "@/shared/libs/data-grid";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";

/**
 * Hook to listen for doc:persist events and orchestrate customer data persistence
 * Handles debouncing, guard logic, and delegates to persistence process
 */
export function useDocumentPersistEvents(
	waId: string,
	customerColumns: IColumnDefinition[],
	customerDataSource: IDataSource,
	isLocalized: boolean,
	ignorePersistUntilRef?: { current: number }
) {
	const persistTimerRef = useRef<number | null>(null);
	const prevByWaRef = useRef<Map<string, { name: string; age: number | null }>>(new Map());
	const persistInFlightRef = useRef<{
		waId: string;
		name: string;
		age: number | null;
	} | null>(null);

	// Listen for explicit persist triggers from the grid (name/phone/age edited)
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { field?: string };
				const f = String(detail?.field || "");

				console.log(`[useDocumentPersistEvents] 📥 Received doc:persist event: field=${f}`);

				// Ignore transient provider-applied changes immediately after switching user
				if (ignorePersistUntilRef && Date.now() < ignorePersistUntilRef.current) {
					console.log("[useDocumentPersistEvents] ⏭️ Ignoring persist (user switch guard)");
					return;
				}

				// Ignore programmatic grid writes that set a suppression flag
				try {
					const suppressUntil = (globalThis as unknown as { __docSuppressPersistUntil?: number })
						.__docSuppressPersistUntil;
					if (typeof suppressUntil === "number" && Date.now() < suppressUntil) {
						console.log("[useDocumentPersistEvents] 🔇 Ignoring persist (suppression flag)");
						return;
					}
				} catch {}

				if (f === "age" || f === "name" || f === "phone") {
					console.log(`[useDocumentPersistEvents] ⏲️ Debouncing persist for field=${f}`);
					if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
					persistTimerRef.current = window.setTimeout(() => {
						try {
							// Preserve which field triggered the persist for accurate toast messaging
							void persistCustomerRow(
								waId,
								customerColumns,
								customerDataSource,
								f as "name" | "age" | "phone",
								isLocalized,
								prevByWaRef.current,
								persistInFlightRef
							);
						} catch {}
					}, 280);
				}
			} catch {}
		};
		window.addEventListener("doc:persist", handler as EventListener);
		return () => window.removeEventListener("doc:persist", handler as EventListener);
	}, [waId, customerColumns, customerDataSource, isLocalized, ignorePersistUntilRef]);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (persistTimerRef.current) {
				clearTimeout(persistTimerRef.current);
			}
		};
	}, []);

	return {
		persistTimerRef,
	} as const;
}
