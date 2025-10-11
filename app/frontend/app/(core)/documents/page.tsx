"use client";

import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { Lock, Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useRef } from "react";
import { clearDocumentState } from "@/processes/documents/document-clear.process";
import type { IDataSource } from "@/shared/libs/data-grid";
import { FullscreenProvider } from "@/shared/libs/data-grid";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";
import { useFullscreen } from "@/shared/libs/hooks/use-fullscreen";
import { i18n } from "@/shared/libs/i18n";
import { useLanguage } from "@/shared/libs/state/language-context";
import { SidebarInset } from "@/shared/ui/sidebar";
import { DocumentCanvas } from "@/widgets/document-canvas/DocumentCanvas";
import { useDocumentCustomerRow } from "@/widgets/document-canvas/hooks/use-document-customer-row";
import { useDocumentPersistEvents } from "@/widgets/document-canvas/hooks/use-document-persist-events";
import { useDocumentSelection } from "@/widgets/document-canvas/hooks/use-document-selection";
import { useDocumentUnlock } from "@/widgets/document-canvas/hooks/use-document-unlock";
import { useDualCanvas } from "@/widgets/document-canvas/hooks/use-dual-canvas";
import { DocumentSavingIndicator } from "@/widgets/documents/DocumentSavingIndicator";
import { DocumentLockOverlay } from "../../../widgets/documents/DocumentLockOverlay";

export default function DocumentsPage() {
	const { resolvedTheme } = useTheme();
	const { locale, isLocalized } = useLanguage();
	const themeMode = useMemo<"light" | "dark">(() => (resolvedTheme === "dark" ? "dark" : "light"), [resolvedTheme]);

	// Refs for coordination between hooks
	const providerRef = useRef<DataProvider | null>(null);
	const providerReadyWaIdRef = useRef<string | null>(null);
	const ignorePersistUntilRef = useRef<number>(0);
	const pendingInitialLoadWaIdRef = useRef<string | null>(DEFAULT_DOCUMENT_WA_ID);

	// Document selection management (URL params + events)
	const { persistTimerRef } = useDocumentPersistEvents(
		"", // waId passed below after hook instantiation
		[], // columns passed below
		{} as IDataSource, // dataSource passed below
		isLocalized,
		ignorePersistUntilRef
	);

	const { waId, setWaId } = useDocumentSelection({
		ignorePersistUntilRef,
		persistTimerRef,
		pendingInitialLoadWaIdRef,
	});

	// Customer row (single-row grid): name | age | phone
	const {
		customerColumns,
		customerDataSource,
		customerLoading,
		validationErrors,
		onDataProviderReady: onDataProviderReadyFromHook,
	} = useDocumentCustomerRow(waId);

	// Document unlock state based on customer data validation
	const { isUnlocked, recomputeUnlock } = useDocumentUnlock(waId, customerColumns, customerDataSource as IDataSource);

	// Re-wire persist events hook with actual waId and customer data
	useDocumentPersistEvents(
		waId,
		customerColumns,
		customerDataSource as IDataSource,
		isLocalized,
		ignorePersistUntilRef
	);

	// Saving/autosave and canvas handlers
	const {
		scene,
		liveScene,
		handleViewerCanvasChange,
		handleCanvasChange,
		onViewerApiReady,
		onApiReadyWithApply,
		saveStatus,
		loading,
	} = useDualCanvas({
		waId,
		theme: themeMode,
		isUnlocked,
		initialLoadActive: pendingInitialLoadWaIdRef.current === waId,
	});

	// Fullscreen management
	const { isFullscreen, enterFullscreen, exitFullscreen, containerRef } = useFullscreen();

	// Wire provider events: fetch initial row (hook) and detect commits
	const handleProviderReady = useCallback(
		async (provider: unknown) => {
			try {
				providerRef.current = provider as DataProvider;
				// StrictMode can double-invoke; avoid re-running heavy init for the same waId
				if (providerReadyWaIdRef.current === waId) {
					console.log("[Documents] ⏭️ Skipping duplicate provider init for waId=", waId);
					return;
				}
				// Reserve this waId immediately to prevent racing duplicate inits
				providerReadyWaIdRef.current = waId;
				if (waId) {
					console.log("[Documents] 📋 Grid provider ready, loading customer data");
					// Prefill row with name/age for current waId
					try {
						await onDataProviderReadyFromHook(provider);
					} catch (e) {
						// Clear guard on failure so we can retry
						providerReadyWaIdRef.current = null;
						throw e;
					}
					console.log("[Documents] 📋 Customer data loaded, checking unlock status");
					try {
						await recomputeUnlock();
					} catch (e) {
						// Clear guard on failure so we can retry
						providerReadyWaIdRef.current = null;
						throw e;
					}
				} else {
					console.log("[Documents] 📋 Grid provider ready (blank waId), skipping customer load");
				}
				// Attach commit-like hook
				try {
					(
						providerRef.current as unknown as {
							setOnCellDataLoaded?: (cb: (c: number, r: number) => void) => void;
						}
					)?.setOnCellDataLoaded?.(((colIdx: number, rowIdx: number) => {
						try {
							const column = (providerRef.current as DataProvider).getColumnDefinition(colIdx);
							if (!column) return;
							if (rowIdx !== 0) return; // single-row grid
							// Guard: ignore provider-applied loads for a brief window after waId change
							if ((globalThis as unknown as { __docIgnoreProviderLoad?: number }).__docIgnoreProviderLoad) {
								console.log("[Documents] ⏭️ Ignoring cell change (guard active)");
								return;
							}
							console.log(`[Documents] 📝 Cell changed: col=${colIdx}, triggering unlock check`);
							void recomputeUnlock();
						} catch {}
					}) as unknown as (c: number, r: number) => void);
				} catch {}
			} catch {}
		},
		[onDataProviderReadyFromHook, recomputeUnlock, waId]
	);

	// Clear action (UI-only): reset grid row and scene, lock until new input
	const handleClear = useCallback(async () => {
		try {
			const result = await clearDocumentState({
				customerColumns,
				customerDataSource: customerDataSource as IDataSource,
				providerRef,
			});

			// Reset to default document and mark as pending initial load
			pendingInitialLoadWaIdRef.current = result.waId;
			setWaId(result.waId);
		} catch {}
	}, [customerColumns, customerDataSource, setWaId]);

	// Defer Grid import to client to avoid SSR window references inside the library
	const ClientGrid = useMemo(
		() =>
			dynamic(() => import("@/shared/libs/data-grid/components/Grid"), {
				ssr: false,
			}),
		[]
	);

	return (
		<SidebarInset>
			<div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-1">
				{/* Header spacer (calendar icon exists elsewhere) */}
				<div className="flex items-center justify-end gap-2" />

				{/* Work area: grid + canvases */}
				<div
					ref={containerRef}
					className={`flex-1 rounded-lg border border-border/50 bg-card/50 p-2 ${isFullscreen ? "p-0 rounded-none border-0" : ""}`}
				>
					<div
						className="flex flex-col gap-2 min-h-0"
						style={{ height: isFullscreen ? "100vh" : "calc(100vh - 6.5rem)" }}
					>
						{/* Top: customer grid */}
						<div className="rounded-md border border-border/50 bg-background/60 p-1 w-full flex-shrink-0">
							<FullscreenProvider>
								<ClientGrid
									showThemeToggle={false}
									dataSource={customerDataSource as unknown as IDataSource}
									onDataProviderReady={handleProviderReady}
									validationErrors={validationErrors}
									onAddRowOverride={handleClear}
									fullWidth={true}
									hideAppendRowPlaceholder={true}
									rowMarkers="none"
									disableTrailingRow={true}
									loading={customerLoading}
									className="min-h-[64px] w-full"
									documentsGrid={true}
								/>
							</FullscreenProvider>
						</div>

						{/* Below: dual canvases */}
						<div className="flex-1 flex flex-col gap-2 min-h-0">
							{/* Viewer (top, ~150px) - real-time mirror of editor with independent camera */}
							<div className="relative rounded-md border border-border/50 bg-card/40 overflow-hidden viewer-canvas-container h-[150px] flex-shrink-0">
								<DocumentCanvas
									theme={themeMode}
									langCode={locale || "en"}
									onChange={handleViewerCanvasChange as ExcalidrawProps["onChange"]}
									onApiReady={onViewerApiReady}
									{...(liveScene
										? {
												// Cast to satisfy mutable requirement; we do not mutate elements here
												scene: liveScene as unknown as {
													elements?: unknown[];
													appState?: Record<string, unknown>;
													files?: Record<string, unknown>;
												} as unknown as {
													elements?: unknown[];
													appState?: Record<string, unknown>;
													files?: Record<string, unknown>;
												},
											}
										: {})}
									viewModeEnabled={true}
									zenModeEnabled={true}
									scrollable={false}
									forceLTR={true}
									hideToolbar={true}
									hideHelpIcon={true}
									uiOptions={{
										canvasActions: {
											toggleTheme: false,
											export: false,
											saveAsImage: false,
											clearCanvas: false,
											loadScene: false,
											saveToActiveFile: false,
										},
									}}
								/>
								{/* Saving indicator overlay */}
								<div className="pointer-events-none absolute right-2 top-2 z-[5]">
									<DocumentSavingIndicator status={saveStatus} loading={loading} />
								</div>
								{/* Lock overlay when not unlocked (viewer - no message) */}
								{(loading || !isUnlocked) && (
									<div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
										<div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2 text-sm text-muted-foreground shadow">
											<Lock className="size-4 opacity-70" />
										</div>
									</div>
								)}
							</div>

							{/* Editor (bottom, flex-fill) */}
							<div
								className={`relative flex-1 min-h-0 ${isFullscreen ? "rounded-none border-0" : "rounded-md border border-border/50"} bg-card/40 overflow-hidden flex flex-col`}
							>
								<DocumentCanvas
									theme={themeMode}
									langCode={locale || "en"}
									onChange={handleCanvasChange as ExcalidrawProps["onChange"]}
									onApiReady={onApiReadyWithApply}
									{...(scene
										? {
												scene: scene as unknown as {
													elements?: unknown[];
													appState?: Record<string, unknown>;
													files?: Record<string, unknown>;
												} as unknown as {
													elements?: unknown[];
													appState?: Record<string, unknown>;
													files?: Record<string, unknown>;
												},
											}
										: {})}
									viewModeEnabled={false}
									zenModeEnabled={false}
									scrollable={false}
									forceLTR={true}
									hideHelpIcon={true}
								/>

								{/* Lock overlay when not unlocked; show loading when busy */}
								{(loading || !isUnlocked) && (
									<DocumentLockOverlay
										message={
											!isUnlocked
												? i18n.getMessage("document_unlock_prompt", isLocalized)
												: i18n.getMessage("document_loading", isLocalized)
										}
									/>
								)}
								{/* Fullscreen toggle button (theme-aware container) */}
								<div className="absolute bottom-2 right-2 z-[5]">
									<div className="rounded-md border border-border bg-card/90 text-foreground shadow-sm backdrop-blur px-1.5 py-1">
										{isFullscreen ? (
											<button
												type="button"
												className="excalidraw-fullscreen-button"
												onClick={exitFullscreen}
												aria-label="Exit fullscreen"
											>
												<Minimize2 className="size-4" />
											</button>
										) : (
											<button
												type="button"
												className="excalidraw-fullscreen-button"
												onClick={enterFullscreen}
												aria-label="Enter fullscreen"
											>
												<Maximize2 className="size-4" />
											</button>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</SidebarInset>
	);
}
