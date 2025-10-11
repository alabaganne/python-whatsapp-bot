"use client";

import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeSceneSignature } from "@/shared/libs/documents/scene-utils";
import { useDocumentScene } from "@/widgets/document-canvas/hooks/use-document-scene";

type Scene = {
	elements?: readonly unknown[];
	appState?: Record<string, unknown>;
	files?: Record<string, unknown>;
} | null;

export type UseDualCanvasOptions = {
	waId: string;
	theme: "light" | "dark";
	isUnlocked: boolean;
	initialLoadActive?: boolean;
};

export function useDualCanvas({ waId, theme, isUnlocked, initialLoadActive = false }: UseDualCanvasOptions) {
	const [scene, setScene] = useState<Scene>(null);
	const [liveScene, setLiveScene] = useState<Scene>(null);

	// Direct API reference to the viewer (top) canvas to avoid React re-renders during mirroring
	const viewerApiRef = useRef<ExcalidrawImperativeAPI | null>(null);

	// References for camera tracking and throttling
	const viewerCameraRef = useRef<Record<string, unknown>>({});
	const lastViewerCameraSigRef = useRef<string>("");
	const sceneRef = useRef<Scene>(scene);
	useEffect(() => {
		sceneRef.current = scene;
	}, [scene]);
	// Track which waId has already completed initial apply to stop further re-applies
	const appliedForWaIdRef = useRef<string | null>(null);
	const lastAppliedSigRef = useRef<string>("");

	// Throttle viewer updates (match Documents page)
	const lastLiveSceneUpdateRef = useRef<number>(0);
	const pendingLiveSceneUpdateRef = useRef<{
		elements: readonly unknown[];
		files: Record<string, unknown>;
	} | null>(null);
	const liveSceneRafRef = useRef<number | null>(null);
	const liveSceneTimeoutRef = useRef<number | null>(null);
	const lastEditorCameraRef = useRef<Record<string, unknown>>({});

	// Hook that manages autosave and API
	const {
		handleCanvasChange: originalHandleCanvasChange,
		onExcalidrawAPI,
		saveStatus,
		loading,
		flushNow,
	} = useDocumentScene(waId, {
		enabled: true,
		isUnlocked,
	});

	// Wire the viewer API (top canvas) so we can mirror editor changes imperatively
	const onViewerApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
		viewerApiRef.current = api;
	}, []);

	// Apply external scene updates on first load only (shared logic with page)
	useEffect(() => {
		const onExternal = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					document?: Record<string, unknown> | null;
				};
				if (String(detail?.wa_id || "") !== String(waId)) return;
				// Only apply while initial load is active and not yet finalized for this waId
				if (!initialLoadActive) return;
				if (appliedForWaIdRef.current === waId) return;

				const s = (detail?.document || null) as unknown as {
					elements?: unknown[];
					appState?: Record<string, unknown>;
					files?: Record<string, unknown>;
					viewerAppState?: Record<string, unknown>;
				} | null;
				if (!s) return;
				const nextSig = computeSceneSignature(
					(s.elements as unknown[]) || [],
					(s.appState as Record<string, unknown>) || {},
					(s.files as Record<string, unknown>) || {}
				);
				const hasElements = Array.isArray(s.elements) && s.elements.length > 0;
				// Ignore if identical to last applied to avoid duplicate re-applies
				if (nextSig && hasElements && nextSig !== lastAppliedSigRef.current) {
					setScene(s);
					const viewerCamera = s.viewerAppState || {};
					viewerCameraRef.current = viewerCamera;
					setLiveScene({
						elements: (s.elements as unknown[]) || [],
						appState: viewerCamera,
						files: s.files || {},
					});
					// Mark applied for this waId to prevent further editor re-application
					appliedForWaIdRef.current = waId;
					lastAppliedSigRef.current = nextSig;
				}
			} catch {}
		};
		const onApplied = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					scene?: Record<string, unknown> | null;
				};
				if (String(detail?.wa_id || "") !== String(waId)) return;
				// Only apply while initial load is active and not yet finalized for this waId
				if (!initialLoadActive) return;
				if (appliedForWaIdRef.current === waId) return;
				const s = (detail?.scene || null) as {
					elements?: unknown[];
					appState?: Record<string, unknown>;
					files?: Record<string, unknown>;
					viewerAppState?: Record<string, unknown>;
				} | null;
				if (s) {
					const nextSig = computeSceneSignature(
						(s.elements as unknown[]) || [],
						(s.appState as Record<string, unknown>) || {},
						(s.files as Record<string, unknown>) || {}
					);
					if (nextSig && nextSig !== lastAppliedSigRef.current) {
						setScene(s);
						const viewerCamera = s.viewerAppState || {};
						viewerCameraRef.current = viewerCamera;
						setLiveScene({
							elements: (s.elements as unknown[]) || [],
							appState: viewerCamera,
							files: s.files || {},
						});
						// Mark applied for this waId to prevent further editor re-application
						appliedForWaIdRef.current = waId;
						lastAppliedSigRef.current = nextSig;
					}
				}
			} catch {}
		};
		window.addEventListener("documents:external-update", onExternal as EventListener);
		window.addEventListener("documents:sceneApplied", onApplied as EventListener);
		return () => {
			window.removeEventListener("documents:external-update", onExternal as EventListener);
			window.removeEventListener("documents:sceneApplied", onApplied as EventListener);
		};
	}, [waId, initialLoadActive]);

	// Viewer canvas changes (camera only)
	const handleViewerCanvasChange = useCallback<NonNullable<ExcalidrawProps["onChange"]>>(
		(_elements, appState) => {
			const zoomValue = (appState.zoom as { value?: number })?.value ?? 1;
			const scrollX = (appState.scrollX as number) ?? 0;
			const scrollY = (appState.scrollY as number) ?? 0;
			const camera = {
				zoom: Math.round(zoomValue * 1000) / 1000,
				scrollX: Math.round(scrollX),
				scrollY: Math.round(scrollY),
			};
			const newSig = JSON.stringify(camera);
			if (newSig === lastViewerCameraSigRef.current) return;
			viewerCameraRef.current = appState as unknown as Record<string, unknown>;
			lastViewerCameraSigRef.current = newSig;

			try {
				const currentScene = sceneRef.current;
				if (!currentScene?.elements || !isUnlocked) return;
				const editorCamera = currentScene.appState
					? {
							zoom: currentScene.appState.zoom,
							scrollX: currentScene.appState.scrollX,
							scrollY: currentScene.appState.scrollY,
						}
					: undefined;
				originalHandleCanvasChange(
					currentScene.elements as unknown as unknown[],
					currentScene.appState || {},
					currentScene.files || {},
					viewerCameraRef.current,
					editorCamera
				);
			} catch {}
		},
		[originalHandleCanvasChange, isUnlocked]
	);

	// Editor canvas changes (elements/files + throttled live viewer mirror)
	const handleCanvasChange = useCallback<NonNullable<ExcalidrawProps["onChange"]>>(
		(elements, appState, files) => {
			// Check if pointer is active
			let isPointerActive = false;
			try {
				isPointerActive = Boolean((globalThis as unknown as { __docPointerActive?: boolean }).__docPointerActive);
			} catch {}

			// During active drags: update viewer immediately (synchronously) for real-time mirroring
			if (isPointerActive) {
				// Cancel any pending updates
				if (liveSceneRafRef.current !== null) {
					try {
						cancelAnimationFrame(liveSceneRafRef.current);
					} catch {}
					liveSceneRafRef.current = null;
				}
				if (liveSceneTimeoutRef.current !== null) {
					try {
						clearTimeout(liveSceneTimeoutRef.current);
					} catch {}
					liveSceneTimeoutRef.current = null;
				}
				// Synchronous update - no rAF delay for real-time mirroring
				if (viewerApiRef.current?.updateScene) {
					try {
						viewerApiRef.current.updateScene({
							elements: elements as unknown as unknown[],
							// During drag, only elements for minimal overhead
							captureUpdate: "never",
						} as unknown as Record<string, unknown>);
					} catch {}
				}
			} else {
				// When not dragging: throttle to ~60 FPS with single rAF
				const now = Date.now();
				const timeSinceLastUpdate = now - lastLiveSceneUpdateRef.current;
				const shouldUpdate = timeSinceLastUpdate >= 16; // ~60 FPS
				if (shouldUpdate) {
					lastLiveSceneUpdateRef.current = now;
					// Cancel any pending updates
					if (liveSceneRafRef.current !== null) {
						try {
							cancelAnimationFrame(liveSceneRafRef.current);
						} catch {}
						liveSceneRafRef.current = null;
					}
					if (liveSceneTimeoutRef.current !== null) {
						try {
							clearTimeout(liveSceneTimeoutRef.current);
						} catch {}
						liveSceneTimeoutRef.current = null;
					}
					// Single rAF for batch with paint
					liveSceneRafRef.current = requestAnimationFrame(() => {
						liveSceneRafRef.current = null;
						if (viewerApiRef.current?.updateScene) {
							try {
								viewerApiRef.current.updateScene({
									elements: elements as unknown as unknown[],
									appState: (viewerCameraRef.current as Record<string, unknown>) || {},
									files,
									captureUpdate: "never",
								} as unknown as Record<string, unknown>);
							} catch {}
						} else {
							setLiveScene({
								elements,
								appState: (viewerCameraRef.current as Record<string, unknown>) || {},
								files,
							});
						}
					});
				} else {
					// Queue for next throttle window
					pendingLiveSceneUpdateRef.current = { elements, files } as {
						elements: readonly unknown[];
						files: Record<string, unknown>;
					};
					if (liveSceneRafRef.current === null && liveSceneTimeoutRef.current === null) {
						const delay = Math.max(0, 16 - timeSinceLastUpdate);
						liveSceneTimeoutRef.current = window.setTimeout(() => {
							const pending = pendingLiveSceneUpdateRef.current;
							if (pending) {
								lastLiveSceneUpdateRef.current = Date.now();
								liveSceneRafRef.current = requestAnimationFrame(() => {
									liveSceneRafRef.current = null;
									if (viewerApiRef.current?.updateScene) {
										try {
											viewerApiRef.current.updateScene({
												elements: pending.elements as unknown as unknown[],
												appState: (viewerCameraRef.current as Record<string, unknown>) || {},
												files: pending.files,
												captureUpdate: "never",
											} as unknown as Record<string, unknown>);
										} catch {}
									} else {
										setLiveScene({
											elements: pending.elements as unknown[],
											appState: (viewerCameraRef.current as Record<string, unknown>) || {},
											files: pending.files,
										});
									}
								});
								pendingLiveSceneUpdateRef.current = null;
							}
							liveSceneTimeoutRef.current = null;
						}, delay) as unknown as number;
					}
				}
			}

			// Reuse editor camera object when possible
			const currentZoom = appState.zoom;
			const currentScrollX = appState.scrollX;
			const currentScrollY = appState.scrollY;
			const lastCamera = lastEditorCameraRef.current;
			if (
				lastCamera.zoom !== currentZoom ||
				lastCamera.scrollX !== currentScrollX ||
				lastCamera.scrollY !== currentScrollY
			) {
				lastEditorCameraRef.current = {
					zoom: currentZoom,
					scrollX: currentScrollX,
					scrollY: currentScrollY,
				};
			}

			originalHandleCanvasChange(
				elements as unknown as unknown[],
				appState as unknown as Record<string, unknown>,
				files,
				viewerCameraRef.current,
				lastEditorCameraRef.current
			);
		},
		[originalHandleCanvasChange]
	);

	// API ready handler: apply theme and initial scene and refresh bursts to fix offset
	const onApiReadyWithApply = useCallback(
		(api: ExcalidrawImperativeAPI) => {
			try {
				onExcalidrawAPI(api as unknown as ExcalidrawImperativeAPI);
				// Only apply current scene if we haven't finalized initial apply for this waId
				const current = sceneRef.current;
				if (current && appliedForWaIdRef.current !== waId) {
					Promise.resolve().then(() => {
						try {
							requestAnimationFrame(() => {
								try {
									(
										api as unknown as {
											updateScene?: (s: Record<string, unknown>) => void;
										}
									).updateScene?.({
										...current,
										appState: {
											...(current.appState || {}),
											viewModeEnabled: false,
											zenModeEnabled: false,
											theme,
										},
									});
									// Update lastAppliedSigRef to current scene so we don't re-apply the same content
									try {
										const sig = computeSceneSignature(
											(current.elements as unknown[]) || [],
											(current.appState as Record<string, unknown>) || {},
											(current.files as Record<string, unknown>) || {}
										);
										if (sig) lastAppliedSigRef.current = sig;
									} catch {}
									// Do not mark appliedForWaIdRef here; wait for explicit external/sceneApplied
									// refresh bursts to correct any offset after layout changes
									try {
										setTimeout(() => api.refresh?.(), 60);
										setTimeout(() => api.refresh?.(), 140);
										setTimeout(() => api.refresh?.(), 260);
									} catch {}
								} catch {}
							});
						} catch {}
					});
				}
			} catch {}
		},
		[onExcalidrawAPI, theme, waId]
	);

	return useMemo(
		() => ({
			scene,
			liveScene,
			handleViewerCanvasChange,
			handleCanvasChange,
			onViewerApiReady,
			onApiReadyWithApply,
			saveStatus,
			loading,
			flushNow,
		}),
		[
			scene,
			liveScene,
			handleViewerCanvasChange,
			handleCanvasChange,
			onViewerApiReady,
			onApiReadyWithApply,
			saveStatus,
			loading,
			flushNow,
		]
	);
}
