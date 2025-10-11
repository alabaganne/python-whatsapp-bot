"use client";

import { useCallback, useEffect, useState } from "react";
import type { IDataSource } from "@/shared/libs/data-grid";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";

const DEFAULT_DOCUMENT_WA_ID = "";

/**
 * Hook to manage document unlock state based on customer data validation
 * A document is unlocked when:
 * - waId is present and not the default blank document
 * - Name field is filled with valid text
 * - Phone field is filled and starts with '+'
 */
export function useDocumentUnlock(waId: string, customerColumns: IColumnDefinition[], customerDataSource: IDataSource) {
	const [isUnlocked, setIsUnlocked] = useState(false);

	// Compute unlock state based on customer data validation
	const recomputeUnlock = useCallback(async () => {
		try {
			// Skip check if no customer selected (blank document)
			if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
				if (isUnlocked) {
					console.log("[useDocumentUnlock] 🔓 No customer selected, locking canvas");
					setIsUnlocked(false);
				}
				return;
			}

			// Find columns by id
			const nameCol = customerColumns.findIndex((c) => c.id === "name");
			const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

			console.log(`[useDocumentUnlock] 🔓 Checking unlock: waId=${waId}, nameCol=${nameCol}, phoneCol=${phoneCol}`);

			const [nameVal, phoneVal] = await Promise.all([
				customerDataSource.getCellData(nameCol, 0),
				customerDataSource.getCellData(phoneCol, 0),
			]);

			const nameOk = typeof nameVal === "string" && nameVal.trim().length > 0;
			const phoneOk = typeof phoneVal === "string" && phoneVal.trim().startsWith("+");
			const waIdOk = waId && waId !== DEFAULT_DOCUMENT_WA_ID;
			const shouldUnlock = Boolean(nameOk && phoneOk && waIdOk);

			console.log(
				`[useDocumentUnlock] 🔓 Unlock check: name="${nameVal}" (${nameOk ? "✅" : "❌"}), phone="${phoneVal}" (${phoneOk ? "✅" : "❌"}), waId="${waId}" (${waIdOk ? "✅" : "❌"}) → ${shouldUnlock ? "UNLOCKED 🔓" : "LOCKED 🔒"}`
			);

			setIsUnlocked(shouldUnlock);
		} catch (err) {
			console.error("[useDocumentUnlock] ❌ Error computing unlock:", err);
			setIsUnlocked(false);
		}
	}, [customerColumns, customerDataSource, waId, isUnlocked]);

	// Listen for customer data loaded event and recompute unlock
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { waId?: string };
				const eventWaId = String(detail?.waId || "");
				console.log(
					`[useDocumentUnlock] 📥 doc:customer-loaded event: eventWaId=${eventWaId}, currentWaId=${waId}, match=${eventWaId === waId}`
				);
				if (eventWaId === waId) {
					console.log("[useDocumentUnlock] ✅ Customer loaded, triggering unlock check");
					void recomputeUnlock();
				}
			} catch {}
		};
		window.addEventListener("doc:customer-loaded", handler as EventListener);
		return () => window.removeEventListener("doc:customer-loaded", handler as EventListener);
	}, [waId, recomputeUnlock]);

	// Log unlock state changes
	useEffect(() => {
		console.log(`[useDocumentUnlock] 🔓 Canvas state changed: ${isUnlocked ? "UNLOCKED ✅" : "LOCKED 🔒"}`);
	}, [isUnlocked]);

	return {
		isUnlocked,
		recomputeUnlock,
	} as const;
}
