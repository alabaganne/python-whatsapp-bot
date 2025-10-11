/**
 * Document Clear Process
 * Handles clearing/resetting document state including grid, scene, and waId
 */

import type { IDataSource } from "@/shared/libs/data-grid";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";

const DEFAULT_DOCUMENT_WA_ID = "";

export interface ClearDocumentOptions {
	customerColumns: IColumnDefinition[];
	customerDataSource: IDataSource;
	providerRef?: { current: DataProvider | null };
}

/**
 * Clears the document state by:
 * 1. Resetting grid cells (name, age, phone) to empty
 * 2. Clearing provider editing state
 * 3. Returning the default waId for state reset
 */
export async function clearDocumentState(
	options: ClearDocumentOptions
): Promise<{ waId: string; shouldUnlock: boolean }> {
	try {
		const { customerColumns, customerDataSource, providerRef } = options;

		const nameCol = customerColumns.findIndex((c) => c.id === "name");
		const ageCol = customerColumns.findIndex((c) => c.id === "age");
		const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

		// Clear editing state through provider to ensure grid immediately reflects
		try {
			providerRef?.current?.setOnCellDataLoaded?.(() => {});
		} catch {}

		await customerDataSource.setCellData(nameCol, 0, "");
		await customerDataSource.setCellData(ageCol, 0, null);
		await customerDataSource.setCellData(phoneCol, 0, "");

		// Set guard to ignore provider-applied loads for the next tick
		try {
			(globalThis as unknown as { __docIgnoreProviderLoad?: number }).__docIgnoreProviderLoad = Date.now() + 500;
			setTimeout(() => {
				try {
					delete (globalThis as unknown as { __docIgnoreProviderLoad?: number }).__docIgnoreProviderLoad;
				} catch {}
			}, 600);
		} catch {}

		console.log("[clearDocumentState] 🗑️ Clearing document, resetting to default");

		return {
			waId: DEFAULT_DOCUMENT_WA_ID,
			shouldUnlock: false,
		};
	} catch {
		return {
			waId: DEFAULT_DOCUMENT_WA_ID,
			shouldUnlock: false,
		};
	}
}
