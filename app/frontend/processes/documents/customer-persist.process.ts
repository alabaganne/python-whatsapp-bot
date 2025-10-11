/**
 * Customer Persistence Process
 * Handles saving customer name/age data with toast notifications and duplicate prevention
 */

import { saveCustomerDocument } from "@/shared/libs/api";
import type { IDataSource } from "@/shared/libs/data-grid";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import { i18n } from "@/shared/libs/i18n";
import { toastService } from "@/shared/libs/toast";

const DEFAULT_DOCUMENT_WA_ID = "";

/**
 * Persist customer row data (name/age) to the backend
 * Includes duplicate prevention and appropriate toast messaging
 */
export async function persistCustomerRow(
	waId: string,
	customerColumns: IColumnDefinition[],
	customerDataSource: IDataSource,
	triggeredBy: "name" | "age" | "phone" | undefined,
	isLocalized: boolean,
	prevByWaRef: Map<string, { name: string; age: number | null }>,
	persistInFlightRef: {
		current: { waId: string; name: string; age: number | null } | null;
	}
): Promise<void> {
	try {
		if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) return;

		const nameCol = customerColumns.findIndex((c) => c.id === "name");
		const ageCol = customerColumns.findIndex((c) => c.id === "age");
		const [nameVal, ageVal] = await Promise.all([
			customerDataSource.getCellData(nameCol, 0),
			customerDataSource.getCellData(ageCol, 0),
		]);
		const name = (nameVal as string) || "";
		const age = (ageVal as number | null) ?? null;

		console.log(
			`[persistCustomerRow] 💾 persistRow called: triggeredBy=${triggeredBy}, waId=${waId}, name=${name}, age=${age}`
		);

		// If this was a phone-only edit, show a notification but avoid PUT (API doesn't accept phone here)
		if (triggeredBy === "phone") {
			console.log("[persistCustomerRow] 📞 Phone-only edit, showing toast without PUT");
			toastService.success(i18n.getMessage("saved", isLocalized));
			return;
		}

		const prev = prevByWaRef.get(waId);
		const changed = !prev || prev.name !== name || prev.age !== age;

		console.log(`[persistCustomerRow] 🔍 Change check: prev=${JSON.stringify(prev)}, changed=${changed}`);

		if (!changed) {
			// Nothing changed; still show a small success if user committed
			console.log("[persistCustomerRow] ✅ No changes detected, showing success toast");
			toastService.success(
				triggeredBy === "age" ? i18n.getMessage("age_recorded", isLocalized) : i18n.getMessage("saved", isLocalized)
			);
			return;
		}

		// In-flight guard: prevent duplicate PUTs for identical payload
		const currentSig = { waId, name, age } as const;
		const inflight = persistInFlightRef.current;
		if (
			inflight &&
			inflight.waId === currentSig.waId &&
			inflight.name === currentSig.name &&
			inflight.age === currentSig.age
		) {
			console.log("[persistCustomerRow] 🔄 Identical request in-flight, skipping");
			return;
		}

		console.log(`[persistCustomerRow] 🚀 Sending PUT request: waId=${waId}, name=${name}, age=${age}`);
		persistInFlightRef.current = { waId, name, age };
		await toastService.promise(saveCustomerDocument({ waId, name, age }), {
			loading: i18n.getMessage("saving", isLocalized),
			success: () => i18n.getMessage(triggeredBy === "age" ? "age_recorded" : "saved", isLocalized),
			error: () => i18n.getMessage("save_failed", isLocalized),
		});
		console.log(`[persistCustomerRow] ✅ PUT completed successfully for waId=${waId}`);
		// Update last persisted snapshot
		prevByWaRef.set(waId, { name, age });
		persistInFlightRef.current = null;
	} catch {}
}
