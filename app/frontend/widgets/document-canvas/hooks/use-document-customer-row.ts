"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCustomer } from "@/shared/libs/api";
import { InMemoryDataSource } from "@/shared/libs/data-grid/components/core/data-sources/InMemoryDataSource";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import { ColumnDataType } from "@/shared/libs/data-grid/components/core/interfaces/IDataSource";
import { i18n } from "@/shared/libs/i18n";
import { useLanguage } from "@/shared/libs/state/language-context";

export function useDocumentCustomerRow(selectedWaId: string | null | undefined, _isLocalized?: boolean) {
	const waId = selectedWaId || "";
	const { isLocalized } = useLanguage();
	const localized = _isLocalized ?? isLocalized;
	const [customerLoading, setCustomerLoading] = useState(false);
	const [customerError, setCustomerError] = useState<string | null>(null);
	const [validationErrors] = useState<Array<{ row: number; col: number; message: string; fieldName?: string }>>([]);

	// One-row datasource columns: name, age, phone
	const customerColumns = useMemo<IColumnDefinition[]>(
		() => [
			{
				id: "name",
				name: "name",
				title: i18n.getMessage("field_name", localized),
				dataType: ColumnDataType.TEXT,
				isEditable: true,
				isRequired: true,
				width: 220,
			},
			{
				id: "age",
				name: "age",
				title: i18n.getMessage("field_age", localized),
				dataType: ColumnDataType.NUMBER,
				isEditable: true,
				isRequired: false,
				width: 120,
				metadata: { useWheel: true },
				validationRules: [
					{ type: "min", value: 10, message: "Minimum age is 10" },
					{ type: "max", value: 120, message: "Maximum age is 120" },
				],
			},
			{
				id: "phone",
				name: "phone",
				title: i18n.getMessage("field_phone", localized),
				dataType: ColumnDataType.PHONE,
				isEditable: true,
				isRequired: true,
				width: 220,
			},
		],
		[localized]
	);

	const customerDataSource = useMemo(() => {
		const initialRow: unknown[] = ["", null, ""];
		return new InMemoryDataSource(1, customerColumns.length, customerColumns, [initialRow]);
	}, [customerColumns]);

	// Update column titles live when language changes without losing row data
	useEffect(() => {
		try {
			void (async () => {
				const existing = await customerDataSource.getRowData(0);
				customerDataSource.reset(customerColumns, [existing]);
			})();
		} catch {}
	}, [customerColumns, customerDataSource]);

	// Reserved for future suppression needs (e.g., when programmatically setting values)
	// const suppressAgeSaveRef = useRef<boolean>(false);

	const onAddRowOverride = useCallback(() => {
		// Single-row grid: ignore appending rows
		return;
	}, []);

	// Keep a reference to the grid provider so we can clear editing/cache state
	// when updating the phone cell outside of the provider-ready lifecycle
	const providerRef = useRef<unknown | null>(null);

	// Only name and phone are required for unlock (age is optional)
	const isUnlockReady = true;

	// Guard against duplicate fetches during strict-mode double-mount
	const fetchInFlightRef = useRef<string | null>(null);

	const onDataProviderReady = useCallback(
		async (provider: unknown) => {
			try {
				// Store provider for later cache/editing-state clears (e.g., phone updates)
				providerRef.current = provider;
				// Don't fetch if no customer selected (blank/default document)
				if (!waId || waId.trim() === "") {
					return;
				}

				// Prevent duplicate fetch if already in-flight for this waId
				if (fetchInFlightRef.current === waId) {
					return;
				}

				fetchInFlightRef.current = waId;
				setCustomerLoading(true);
				// Resolve customer via REST immediately (no dependency on WS timing)
				let resolved = false;
				const nameCol = customerColumns.findIndex((c) => c.id === "name");
				const ageCol = customerColumns.findIndex((c) => c.id === "age");
				const phoneCol = customerColumns.findIndex((c) => c.id === "phone");
				const apply = async (name: string, age: number | null) => {
					if (nameCol !== -1) {
						await customerDataSource.setCellData(nameCol, 0, name);
					}
					if (ageCol !== -1) {
						await customerDataSource.setCellData(ageCol, 0, age);
					} else {
						console.error(`[useDocumentCustomerRow] ❌ Age column not found! ageCol=${ageCol}`);
					}
				};
				try {
					// Signal to useDocumentScene that REST GET is in-flight
					(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight = true;

					const resp = (await fetchCustomer(waId)) as unknown as {
						success?: boolean;
						data?: {
							name?: string | null;
							customer_name?: string | null;
							age?: number | null;
							document?: Record<string, unknown> | null;
						};
					};
					const d = resp?.data || {};
					const restName = (d.name ?? d.customer_name ?? "") as string;
					const restAge = (d.age ?? null) as number | null;
					const restDocument = d.document || null;

					// Clear in-flight flag
					(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight = false;

					// If document was included in response, dispatch it immediately to avoid duplicate WS fetch
					if (restDocument) {
						window.dispatchEvent(
							new CustomEvent("documents:external-update", {
								detail: {
									wa_id: waId,
									document: restDocument,
								},
							})
						);
					}

					await apply(restName, restAge);

					// Clear editing state, cache, and force grid to re-render
					try {
						const providerWithInternals = provider as unknown as {
							cellCache?: Map<string, unknown>;
							editingState?: {
								editedCells?: Map<number, Map<number, unknown>>;
							};
						};

						// Step 1: Clear editing state (highest priority in getCell)
						if (providerWithInternals.editingState?.editedCells) {
							const rowMap = providerWithInternals.editingState.editedCells.get(0);
							if (rowMap) {
								rowMap.delete(nameCol);
								rowMap.delete(ageCol);
								if (typeof phoneCol === "number" && phoneCol !== -1) {
									rowMap.delete(phoneCol);
								}
							}
						}

						// Step 2: Clear cache (second priority in getCell)
						if (providerWithInternals.cellCache) {
							providerWithInternals.cellCache.delete(`${nameCol}-0`);
							providerWithInternals.cellCache.delete(`${ageCol}-0`);
							if (typeof phoneCol === "number" && phoneCol !== -1) {
								providerWithInternals.cellCache.delete(`${phoneCol}-0`);
							}
						}

						// Step 3: Force grid to re-render (will fetch fresh from datasource)
						const gridApi = (
							window as unknown as {
								__docGridApi?: {
									updateCells?: (cells: { cell: [number, number] }[]) => void;
								};
							}
						).__docGridApi;
						if (gridApi?.updateCells) {
							const cells: { cell: [number, number] }[] = [{ cell: [nameCol, 0] }, { cell: [ageCol, 0] }];
							if (typeof phoneCol === "number" && phoneCol !== -1) {
								cells.push({ cell: [phoneCol, 0] });
							}
							gridApi.updateCells(cells);
						} else {
							console.warn("[useDocumentCustomerRow] ⚠️ Grid API not available yet");
						}
					} catch (err) {
						console.error("[useDocumentCustomerRow] ❌ Error updating cells:", err);
					}

					resolved = true;
					// Notify page that customer data is loaded and ready to unlock
					window.dispatchEvent(new CustomEvent("doc:customer-loaded", { detail: { waId } }));
					setCustomerError(null);
					setCustomerLoading(false);
				} catch (err) {
					console.error(`[useDocumentCustomerRow] ❌ GET failed for waId=${waId}:`, err);
					// Clear in-flight flag on error
					(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight = false;
				} finally {
					// Clear in-flight guard after a brief delay to allow both mounts to see it
					setTimeout(() => {
						if (fetchInFlightRef.current === waId) {
							fetchInFlightRef.current = null;
						}
					}, 100);
				}
				const listener = (e: Event) => {
					try {
						const d = (e as CustomEvent).detail as {
							wa_id?: string;
							name?: string | null;
							age?: number | null;
						};
						if (String(d?.wa_id || "") !== String(waId)) return;
						resolved = true;
						void apply((d?.name || "") as string, (d?.age ?? null) as number | null).then(() => {
							// Notify page that customer data is loaded and ready to unlock
							window.dispatchEvent(
								new CustomEvent("doc:customer-loaded", {
									detail: { waId },
								})
							);
						});
						setCustomerError(null);
						setCustomerLoading(false);
						window.removeEventListener("customers:profile", listener as EventListener);
					} catch {}
				};
				window.addEventListener("customers:profile", listener as EventListener);
				// Timeout fallback: if WS not received quickly, leave as-is (user can type)
				setTimeout(() => {
					if (!resolved) {
						try {
							window.removeEventListener("customers:profile", listener as EventListener);
						} catch {}
						setCustomerLoading(false);
					}
				}, 1000);
			} catch (e) {
				setCustomerError((e as Error)?.message || "Failed to load customer");
				setCustomerLoading(false);
			}
			void provider;
		},
		[waId, customerColumns, customerDataSource]
	);

	// Update phone field when waId changes - fetch will handle name/age
	const prevWaIdRef = useRef<string | null>(null);
	useEffect(() => {
		try {
			// Only update if waId actually changed
			if (prevWaIdRef.current === waId) return;

			const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

			prevWaIdRef.current = waId;

			// Only update phone - fetch will populate name/age fresh from API
			// Ensure phone has + prefix for unlock validation
			if (phoneCol !== -1) {
				const phoneValue = waId ? (waId.startsWith("+") ? waId : `+${waId}`) : "";
				void customerDataSource.setCellData(phoneCol, 0, phoneValue);

				// Clear editing/cache for the phone cell and force a UI refresh of that cell
				try {
					const providerWithInternals = (providerRef.current || {}) as unknown as {
						cellCache?: Map<string, unknown>;
						editingState?: {
							editedCells?: Map<number, Map<number, unknown>>;
						};
					};
					if (providerWithInternals.editingState?.editedCells) {
						const rowMap = providerWithInternals.editingState.editedCells.get(0);
						rowMap?.delete(phoneCol);
					}
					providerWithInternals.cellCache?.delete(`${phoneCol}-0`);
					const gridApi = (
						window as unknown as {
							__docGridApi?: {
								updateCells?: (cells: { cell: [number, number] }[]) => void;
							};
						}
					).__docGridApi;
					gridApi?.updateCells?.([{ cell: [phoneCol, 0] }]);
				} catch {}
			}
		} catch {}
	}, [waId, customerColumns, customerDataSource]);

	// Live age save when editing the single row
	// In current integration, live editing is wired in the page when data provider is ready

	return {
		customerColumns,
		customerDataSource,
		customerLoading,
		customerError,
		validationErrors,
		onAddRowOverride,
		onDataProviderReady,
		isUnlockReady,
	} as const;
}
