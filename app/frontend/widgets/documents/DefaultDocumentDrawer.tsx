"use client";

import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { useTheme } from "next-themes";
import * as React from "react";
import { requestDocumentLoad } from "@/processes/documents";
import { fetchCustomer } from "@/shared/libs/api";
import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents";
import { useLanguage } from "@/shared/libs/state/language-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { DocumentCanvas } from "@/widgets/document-canvas/DocumentCanvas";
// reuse the same dual-canvas behavior as documents page
import { useDualCanvas } from "@/widgets/document-canvas/hooks/use-dual-canvas";
import { DocumentSavingIndicator } from "./DocumentSavingIndicator";

interface DefaultDocumentDrawerProps {
	className?: string;
	trigger?: React.ReactNode;
	title?: string;
}

/**
 * DefaultDocumentDrawer allows editing the template document that will be
 * copied to all new users when they first open their document.
 */
export function DefaultDocumentDrawer({
	className,
	trigger,
	title = "Default Document Template",
}: DefaultDocumentDrawerProps) {
	const [open, setOpen] = React.useState(false);
	const { resolvedTheme } = useTheme();
	const { locale } = useLanguage();
	// scenes provided by useDualCanvas
	const [loading, setLoading] = React.useState(false);
	const [isLoaded, setIsLoaded] = React.useState(false);

	const themeMode = resolvedTheme === "dark" ? "dark" : "light";

	// state managed by useDualCanvas

	// No debug logs

	// Use the template user's document for autosave, gated by drawer open + loaded
	const {
		scene,
		liveScene,
		handleViewerCanvasChange,
		handleCanvasChange,
		onApiReadyWithApply,
		onViewerApiReady,
		saveStatus,
		loading: hookLoading,
		flushNow,
	} = useDualCanvas({
		waId: TEMPLATE_USER_WA_ID,
		theme: themeMode,
		isUnlocked: open && isLoaded,
		initialLoadActive: !isLoaded,
	});

	// DRY: Common logic for applying scene updates during initial load only
	// handled by useDualCanvas

	// Debug: log when saveStatus changes
	React.useEffect(() => {
		// Removed debug logs for production
	}, []);

	// Viewer canvas changes handled by useDualCanvas

	// Editor handler provided by hook

	// Debug: log canvas changes
	// Removed wrapper; use hook-provided handler directly

	// Ensure initial scene is applied as soon as Excalidraw API is ready
	// onApiReady provided by hook

	// Listen for document updates from WebSocket - ONLY apply during initial load
	// After initial load, editor becomes write-only to prevent remounting during edits
	// External updates handled by useDualCanvas

	// When the hook broadcasts that a scene was applied - ONLY apply during initial load
	// mark loaded when scene applied for template user
	React.useEffect(() => {
		const onApplied = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { wa_id?: string };
				if (String(detail?.wa_id || "") !== TEMPLATE_USER_WA_ID) return;
				setIsLoaded(true);
				setLoading(false);
			} catch {}
		};
		window.addEventListener("documents:sceneApplied", onApplied as unknown as EventListener);
		return () => window.removeEventListener("documents:sceneApplied", onApplied as unknown as EventListener);
	}, []);

	// Load template document when drawer opens (always request fresh snapshot)
	React.useEffect(() => {
		if (!open) return;
		try {
			(globalThis as { __docIgnoreChangesUntil?: number }).__docIgnoreChangesUntil = Date.now() + 1500;
		} catch {}
		setIsLoaded(false);
		setLoading(true);

		// Mark REST in-flight so hooks can coalesce with WS
		(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight = true;

		// Kick off REST fetch immediately to get the latest template snapshot
		void (async () => {
			try {
				const resp = (await fetchCustomer(TEMPLATE_USER_WA_ID)) as unknown as {
					data?: { document?: unknown };
				};
				const restDocument = (resp?.data?.document || null) as Record<string, unknown> | null;
				// Clear in-flight marker before broadcasting
				(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight = false;
				if (restDocument) {
					// Dispatch external-update so useDualCanvas/useDocumentScene can apply
					window.dispatchEvent(
						new CustomEvent("documents:external-update", {
							detail: {
								wa_id: TEMPLATE_USER_WA_ID,
								document: restDocument,
							},
						})
					);
				}
			} catch {
				// Ensure marker is cleared even on error
				(globalThis as { __docRestInFlight?: boolean }).__docRestInFlight = false;
			}
		})();

		// Also request via WebSocket; reducer will broadcast external-update
		requestDocumentLoad(TEMPLATE_USER_WA_ID).catch(() => {});
	}, [open]);

	// When closing, keep scene but lock saves
	React.useEffect(() => {
		if (!open) {
			setIsLoaded(false);
		}
	}, [open]);

	return (
		<Sheet
			open={open}
			onOpenChange={(v) => {
				try {
					if (!v) {
						// Best-effort flush on close
						flushNow?.();
					}
				} catch {}
				setOpen(v);
			}}
		>
			{trigger ? (
				React.isValidElement(trigger) ? (
					<SheetTrigger asChild>{trigger}</SheetTrigger>
				) : (
					<SheetTrigger asChild>
						<Button variant="outline">Edit Template</Button>
					</SheetTrigger>
				)
			) : (
				<SheetTrigger asChild>
					<Button variant="outline">Edit Template</Button>
				</SheetTrigger>
			)}
			<SheetContent
				side="right"
				className={cn("w-[95vw] max-w-none sm:max-w-none p-0 flex flex-col overflow-hidden", className)}
			>
				<SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between pr-12">
					<SheetTitle>{title}</SheetTitle>
					<DocumentSavingIndicator status={saveStatus} loading={loading || hookLoading} />
				</SheetHeader>

				<div className="flex-1 min-h-0 p-2 flex flex-col gap-2">
					{/* Top viewer canvas (read-only, mirrors bottom editor) */}
					<div className="relative h-[150px] flex-shrink-0">
						<div className="viewer-canvas-container relative h-full rounded-md border border-border/50 bg-card/40 overflow-hidden">
							<style>{`
								.viewer-canvas-container button[title*="Exit"],
								.viewer-canvas-container button[aria-label*="Exit"],
								.viewer-canvas-container .excalidraw-textEditorContainer,
								.viewer-canvas-container .layer-ui__wrapper__footer-right,
								.viewer-canvas-container .layer-ui__wrapper__footer-left,
								.viewer-canvas-container .layer-ui__wrapper__top-right,
								.viewer-canvas-container .Island:has(button[title*="canvas actions"]),
								.viewer-canvas-container button[title*="View mode"],
								.viewer-canvas-container button[title*="Zen mode"],
								.viewer-canvas-container button[title*="zen mode"],
								.viewer-canvas-container .zen-mode-visibility,
								.viewer-canvas-container button[aria-label*="fullscreen" i],
								.viewer-canvas-container button[title*="fullscreen" i],
								.viewer-canvas-container .excalidraw__canvas {
									pointer-events: auto !important;
								}
								.viewer-canvas-container button[title*="Exit"]:not([title*="fullscreen" i]),
								.viewer-canvas-container button[aria-label*="Exit"]:not([aria-label*="fullscreen" i]) {
									display: none !important;
								}
							`}</style>
							<DocumentCanvas
								theme={themeMode}
								langCode={locale || "en"}
								onChange={handleViewerCanvasChange as unknown as ExcalidrawProps["onChange"]}
								onApiReady={onViewerApiReady}
								{...(liveScene
									? {
											scene: {
												elements: [...(((liveScene.elements as unknown[]) || []) as unknown[])],
												appState: {
													...((liveScene.appState || {}) as Record<string, unknown>),
												},
												files: {
													...((liveScene.files || {}) as Record<string, unknown>),
												},
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
						</div>
					</div>

					{/* Bottom editor canvas (editable) */}
					<div
						className="relative rounded-md border border-border/50 bg-card/40 overflow-hidden flex-1"
						style={{ minHeight: "450px" }}
					>
						{!loading && (
							<DocumentCanvas
								theme={themeMode}
								langCode={locale || "en"}
								onChange={handleCanvasChange as unknown as ExcalidrawProps["onChange"]}
								onApiReady={onApiReadyWithApply}
								{...(scene
									? {
											scene: {
												elements: [...(((scene.elements as unknown[]) || []) as unknown[])],
												appState: {
													...((scene.appState || {}) as Record<string, unknown>),
												},
												files: {
													...((scene.files || {}) as Record<string, unknown>),
												},
											},
										}
									: {})}
								viewModeEnabled={false}
								zenModeEnabled={false}
								scrollable={false}
								forceLTR={true}
								hideHelpIcon={false}
							/>
						)}
						{loading && (
							<div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
								<div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2 text-sm text-muted-foreground shadow">
									<span>Loading template...</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
