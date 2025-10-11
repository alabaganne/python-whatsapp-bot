"use client";

import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

// import { computeSceneSignature } from "@/shared/libs/documents/scene-utils";

type ExcalidrawAPI = ExcalidrawImperativeAPI;

const Excalidraw = dynamic<ExcalidrawProps>(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
	ssr: false,
});

function DocumentCanvasComponent({
	theme,
	langCode,
	onChange,
	onApiReady,
	viewModeEnabled,
	zenModeEnabled,
	uiOptions,
	scene,
	scrollable,
	forceLTR,
	hideToolbar,
	hideHelpIcon,
}: {
	theme: "light" | "dark";
	langCode: string;
	onChange?: ExcalidrawProps["onChange"];
	onApiReady: (api: ExcalidrawAPI) => void;
	viewModeEnabled?: boolean;
	zenModeEnabled?: boolean;
	uiOptions?: ExcalidrawProps["UIOptions"];
	scene?: {
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
	};
	scrollable?: boolean;
	forceLTR?: boolean;
	hideToolbar?: boolean;
	hideHelpIcon?: boolean;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const apiRef = useRef<ExcalidrawAPI | null>(null);
	const [mountReady, setMountReady] = useState(false);
	// retained for future diffing optimizations (not used at the moment)
	// const lastAppliedSceneSigRef = useRef<string | null>(null);
	const didNotifyApiRef = useRef<boolean>(false);
	const prevDirRef = useRef<string | null>(null);
	const pointerActiveRef = useRef<boolean>(false);
	// Queue external scene updates while pointer is active to avoid jank
	const pendingSceneRef = useRef<{
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
	} | null>(null);

	// Pass onChange directly - don't defer or batch it
	// Excalidraw needs immediate onChange callbacks to repaint the canvas during drags
	// Viewer mirroring throttling is handled in use-dual-canvas.ts
	const noopOnChange = useCallback(() => {}, []);
	const mergedOnChange = (onChange || (noopOnChange as NonNullable<ExcalidrawProps["onChange"]>)) as NonNullable<
		ExcalidrawProps["onChange"]
	>;

	// Don't pass initialData to avoid setState during mount; set via onApiReady instead
	const initialData = useMemo(() => ({}), []);

	// Wait until container has a non-zero size AND theme class matches to mount Excalidraw
	useEffect(() => {
		let raf = 0;
		let attempts = 0;
		const tick = () => {
			attempts += 1;
			try {
				const rect = containerRef.current?.getBoundingClientRect?.();
				let themeMatches = true;
				try {
					const wantsDark = theme === "dark";
					const hasDark = document.documentElement.classList.contains("dark");
					themeMatches = wantsDark === hasDark;
				} catch {}
				if (rect && rect.width > 2 && rect.height > 2 && themeMatches) {
					setMountReady(true);
					return;
				}
			} catch {}
			if (attempts < 60) {
				raf = requestAnimationFrame(tick);
			} else {
				// Fallback: proceed anyway and let refresh() correct the size later
				setMountReady(true);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [theme]);

	// Keep canvas sized when container/viewport changes
	useExcalidrawResize(containerRef, apiRef);

	// Also refresh on scroll and after CSS transitions (e.g., drawer slide) to prevent pointer offset
	useEffect(() => {
		let scheduled = false;
		const scheduleRefresh = () => {
			if (scheduled || pointerActiveRef.current) return;
			scheduled = true;
			try {
				requestAnimationFrame(() => {
					try {
						if (!pointerActiveRef.current) {
							apiRef.current?.refresh?.();
						}
					} finally {
						scheduled = false;
					}
				});
			} catch {
				setTimeout(() => {
					if (!pointerActiveRef.current) {
						apiRef.current?.refresh?.();
					}
					scheduled = false;
				}, 0);
			}
		};
		const onScroll = () => scheduleRefresh();
		const onTransitionEnd = () => {
			// allow final transform to settle, then refresh a few times
			scheduleRefresh();
			setTimeout(scheduleRefresh, 60);
			setTimeout(scheduleRefresh, 140);
		};
		window.addEventListener("scroll", onScroll, {
			capture: true,
			passive: true,
		} as EventListenerOptions);
		document.addEventListener("transitionend", onTransitionEnd, true);
		try {
			window.visualViewport?.addEventListener?.("scroll", onScroll);
		} catch {}
		return () => {
			window.removeEventListener("scroll", onScroll, {
				capture: true,
			} as EventListenerOptions);
			document.removeEventListener("transitionend", onTransitionEnd, true);
			try {
				window.visualViewport?.removeEventListener?.("scroll", onScroll);
			} catch {}
		};
	}, []);

	// Track active pointer/touch gestures to avoid racing our refresh bursts with internal updates
	useEffect(() => {
		let touchCount = 0;
		const onDown = () => {
			pointerActiveRef.current = true;
			try {
				(globalThis as unknown as { __docPointerActive?: boolean }).__docPointerActive = true;
			} catch {}
		};
		const onUp = () => {
			setTimeout(() => {
				if (touchCount === 0) {
					pointerActiveRef.current = false;
					try {
						(globalThis as unknown as { __docPointerActive?: boolean }).__docPointerActive = false;
					} catch {}
					// Flush any pending scene update coalesced during drag
					try {
						const pending = pendingSceneRef.current;
						if (pending && apiRef.current) {
							(
								apiRef.current as unknown as {
									updateScene?: (s: Record<string, unknown>) => void;
								}
							)?.updateScene?.(pending as Record<string, unknown>);
							pendingSceneRef.current = null;
						}
					} catch {}
				}
			}, 120);
		};
		const onTouchStart = (e: TouchEvent) => {
			touchCount = e.touches.length;
			if (touchCount > 0) {
				pointerActiveRef.current = true;
				try {
					(globalThis as unknown as { __docPointerActive?: boolean }).__docPointerActive = true;
				} catch {}
			}
		};
		const onTouchEnd = (e: TouchEvent) => {
			touchCount = e.touches.length;
			setTimeout(() => {
				if (touchCount === 0) {
					pointerActiveRef.current = false;
					try {
						(globalThis as unknown as { __docPointerActive?: boolean }).__docPointerActive = false;
					} catch {}
					// Flush any pending scene update coalesced during drag
					try {
						const pending = pendingSceneRef.current;
						if (pending && apiRef.current) {
							(
								apiRef.current as unknown as {
									updateScene?: (s: Record<string, unknown>) => void;
								}
							)?.updateScene?.(pending as Record<string, unknown>);
							pendingSceneRef.current = null;
						}
					} catch {}
				}
			}, 120);
		};
		const onTouchCancel = () => {
			touchCount = 0;
			setTimeout(() => {
				pointerActiveRef.current = false;
				try {
					(globalThis as unknown as { __docPointerActive?: boolean }).__docPointerActive = false;
				} catch {}
				// Flush any pending scene update coalesced during drag
				try {
					const pending = pendingSceneRef.current;
					if (pending && apiRef.current) {
						(
							apiRef.current as unknown as {
								updateScene?: (s: Record<string, unknown>) => void;
							}
						)?.updateScene?.(pending as Record<string, unknown>);
						pendingSceneRef.current = null;
					}
				} catch {}
			}, 120);
		};
		window.addEventListener("pointerdown", onDown, true);
		window.addEventListener("pointerup", onUp, true);
		window.addEventListener("touchstart", onTouchStart, {
			passive: true,
			capture: true,
		});
		window.addEventListener("touchend", onTouchEnd, {
			passive: true,
			capture: true,
		});
		window.addEventListener("touchcancel", onTouchCancel, {
			passive: true,
			capture: true,
		});
		return () => {
			window.removeEventListener("pointerdown", onDown, true);
			window.removeEventListener("pointerup", onUp, true);
			window.removeEventListener("touchstart", onTouchStart as EventListener, true);
			window.removeEventListener("touchend", onTouchEnd as EventListener, true);
			window.removeEventListener("touchcancel", onTouchCancel, true);
		};
	}, []);

	// Verify canvas fills container on mount and on orientation/pageshow
	useEffect(() => {
		if (!mountReady) return;
		let timer: number | null = null;
		let remaining = 15; // Reduced from 60 - trust ResizeObserver more
		const verifyAndFix = () => {
			try {
				const root = containerRef.current?.querySelector(".excalidraw .canvas-container") as HTMLElement | null;
				const canvas = containerRef.current?.querySelector(
					"canvas.excalidraw__canvas.interactive"
				) as HTMLCanvasElement | null;
				if (!root || !canvas) return true;
				const cw = Math.floor(root.clientWidth || 0);
				const ch = Math.floor(root.clientHeight || 0);
				if (cw <= 1 || ch <= 1) return true;
				const rect = canvas.getBoundingClientRect();
				const sw = Math.floor(rect.width || 0);
				const sh = Math.floor(rect.height || 0);
				if (Math.abs(cw - sw) > 1 || Math.abs(ch - sh) > 1) {
					// Single refresh is enough - ResizeObserver will handle cascading updates
					const refresh = () => apiRef.current?.refresh?.();
					try {
						requestAnimationFrame(refresh);
					} catch {
						refresh();
					}
					return true;
				}
				// Canvas matches container - early exit
				return false;
			} catch {}
			return false;
		};
		const runBurst = () => {
			try {
				const needsMore = verifyAndFix();
				remaining -= 1;
				if (remaining > 0 && needsMore) {
					timer = window.setTimeout(runBurst, 100); // Slower interval
				}
			} catch {}
		};
		// Start verification with single check, then burst if needed
		setTimeout(() => {
			if (verifyAndFix()) {
				setTimeout(() => runBurst(), 50);
			}
		}, 16);
		const onOrientation = () => {
			remaining = 40;
			runBurst();
		};
		const onPageShow = (ev: PageTransitionEvent) => {
			try {
				if ((ev as PageTransitionEvent)?.persisted) {
					remaining = 40;
					runBurst();
				}
			} catch {}
		};
		window.addEventListener("orientationchange", onOrientation);
		window.addEventListener("pageshow", onPageShow as unknown as EventListener);
		// Observe the inner canvas-container for dynamic size changes
		let innerRO: ResizeObserver | null = null;
		let innerScheduled = false;
		try {
			const el = containerRef.current?.querySelector(".excalidraw .canvas-container") as Element | null;
			if (el) {
				innerRO = new ResizeObserver(() => {
					if (innerScheduled) return;
					innerScheduled = true;
					try {
						requestAnimationFrame(() => {
							try {
								apiRef.current?.refresh?.();
								verifyAndFix();
							} finally {
								innerScheduled = false;
							}
						});
					} catch {
						innerScheduled = false;
					}
				});
				innerRO.observe(el);
			}
		} catch {}
		return () => {
			if (timer) window.clearTimeout(timer);
			window.removeEventListener("orientationchange", onOrientation);
			window.removeEventListener("pageshow", onPageShow as unknown as EventListener);
			try {
				innerRO?.disconnect();
			} catch {}
		};
	}, [mountReady]);

	// Coalesced refresh for context and visibility; avoid burst chains
	useEffect(() => {
		let scheduled = false;
		const scheduleRefresh = () => {
			if (scheduled) return;
			scheduled = true;
			requestAnimationFrame(() => {
				if (!pointerActiveRef.current) apiRef.current?.refresh?.();
				scheduled = false;
			});
		};
		const onContextMenu = () => scheduleRefresh();
		const onVisibility = () => {
			if (!document.hidden) scheduleRefresh();
		};
		document.addEventListener("contextmenu", onContextMenu, true);
		document.addEventListener("visibilitychange", onVisibility);
		const onPointerUp = () => scheduleRefresh();
		const onScroll = () => scheduleRefresh();
		window.addEventListener("pointerup", onPointerUp, true);
		window.addEventListener("scroll", onScroll, true);
		const target = containerRef.current as HTMLElement | null;
		let observer: MutationObserver | null = null;
		try {
			if (target) {
				observer = new MutationObserver(() => scheduleRefresh());
				observer.observe(target, {
					attributes: true,
					attributeFilter: ["style", "class"],
				});
			}
		} catch {}
		// Keep theme observer for correctness but coalesce into single rAF
		let themeObserver: MutationObserver | null = null;
		try {
			themeObserver = new MutationObserver(() => scheduleRefresh());
			themeObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});
		} catch {}
		return () => {
			document.removeEventListener("contextmenu", onContextMenu, true);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("pointerup", onPointerUp, true);
			window.removeEventListener("scroll", onScroll, true);
			try {
				observer?.disconnect();
			} catch {}
			try {
				themeObserver?.disconnect();
			} catch {}
		};
	}, []);

	// When theme prop changes, burst refresh to ensure immediate repaint
	useEffect(() => {
		try {
			const doRefresh = () => {
				if (pointerActiveRef.current) return;
				apiRef.current?.refresh?.();
			};
			requestAnimationFrame(() => {
				doRefresh();
				setTimeout(doRefresh, 80);
				setTimeout(doRefresh, 160);
				setTimeout(doRefresh, 320);
			});
		} catch {}
	}, []);

	// Apply external scene updates when provided. Keep it lightweight to avoid jank.
	useEffect(() => {
		try {
			if (!apiRef.current || !scene) return;
			// Cast to any to avoid coupling to Excalidraw internal element types
			const doUpdate = () => {
				try {
					// Preserve viewModeEnabled and zenModeEnabled when updating scene
					const sceneToApply = {
						...scene,
						appState: {
							...(scene.appState || {}),
							viewModeEnabled: Boolean(viewModeEnabled),
							zenModeEnabled: Boolean(zenModeEnabled),
						},
					};
					// If a drag is active, coalesce updates until pointer is released
					if (pointerActiveRef.current) {
						pendingSceneRef.current = sceneToApply as unknown as {
							elements?: unknown[];
							appState?: Record<string, unknown>;
							files?: Record<string, unknown>;
						};
						return;
					}
					// Single rAF to apply; avoid nested rAF→setTimeout chains
					requestAnimationFrame(() => {
						try {
							(
								apiRef.current as unknown as {
									updateScene: (s: Record<string, unknown>) => void;
								}
							).updateScene(sceneToApply as Record<string, unknown>);
						} catch {}
					});
				} catch {}
			};
			doUpdate();
		} catch {}
	}, [scene, viewModeEnabled, zenModeEnabled]);

	// Force theme and view/zen modes so external scene updates can't re-enable editing
	useEffect(() => {
		try {
			if (!apiRef.current) return;
			const apiLike = apiRef.current as unknown as {
				updateScene?: (s: Record<string, unknown>) => void;
			} | null;
			requestAnimationFrame(() => {
				apiLike?.updateScene?.({
					appState: {
						theme,
						viewModeEnabled: Boolean(viewModeEnabled),
						zenModeEnabled: Boolean(zenModeEnabled),
					},
				});
			});
		} catch {}
	}, [theme, viewModeEnabled, zenModeEnabled]);

	// Force LTR direction for Excalidraw even when using RTL languages
	useEffect(() => {
		if (!forceLTR) return () => {};
		try {
			const root = document.documentElement;
			if (prevDirRef.current === null) prevDirRef.current = root.getAttribute("dir");
			root.setAttribute("dir", "ltr");
			const observer = new MutationObserver(() => {
				try {
					const curr = root.getAttribute("dir") || "";
					if (curr.toLowerCase() !== "ltr") root.setAttribute("dir", "ltr");
				} catch {}
			});
			observer.observe(root, { attributes: true, attributeFilter: ["dir"] });
			return () => {
				try {
					observer.disconnect();
					if (prevDirRef.current === null || prevDirRef.current === undefined) {
						root.removeAttribute("dir");
					} else {
						root.setAttribute("dir", String(prevDirRef.current));
					}
				} catch {}
			};
		} catch {
			return () => {};
		}
	}, [forceLTR]);

	return (
		<div
			ref={containerRef}
			className={`excali-theme-scope w-full h-full${hideToolbar ? " excal-preview-hide-ui" : ""}${hideHelpIcon ? " excal-hide-help" : ""}`}
			style={{
				// Prevent scroll chaining into the canvas on touch devices so
				// the page can scroll back when keyboard toggles
				overflow: scrollable ? "auto" : "hidden",
				overscrollBehavior: "contain",
				touchAction: "manipulation",
				// NOTE: contain and willChange removed because they create a new containing block
				// that breaks position:fixed elements (like the eraser cursor shadow)
			}}
			dir={forceLTR ? "ltr" : undefined}
		>
			{hideToolbar ? (
				<style>
					{
						".excal-preview-hide-ui .App-toolbar{display:none!important;}\n.excal-preview-hide-ui .App-toolbar-content{display:none!important;}\n.excal-preview-hide-ui .main-menu-trigger{display:none!important;}"
					}
				</style>
			) : null}
			{hideHelpIcon ? <style>{".excal-hide-help .help-icon{display:none!important;}"}</style> : <style>{""}</style>}
			{mountReady && (
				<Excalidraw
					theme={theme}
					langCode={langCode as unknown as string}
					onChange={mergedOnChange}
					{...(uiOptions ? { UIOptions: uiOptions } : {})}
					initialData={initialData}
					excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
						apiRef.current = api;
						if (!didNotifyApiRef.current) {
							didNotifyApiRef.current = true;
							// Apply initial theme/view/zen state via updateScene to avoid mount-time setState
							Promise.resolve().then(() => {
								try {
									requestAnimationFrame(() => {
										try {
											(
												api as unknown as {
													updateScene?: (s: Record<string, unknown>) => void;
												}
											)?.updateScene?.({
												appState: {
													viewModeEnabled: Boolean(viewModeEnabled),
													zenModeEnabled: Boolean(zenModeEnabled),
													theme,
												},
											});
										} catch {}
										// Now notify parent onApiReady after initial state is applied
										setTimeout(() => {
											try {
												onApiReady(api);
											} catch {}
										}, 0);
									});
								} catch {
									setTimeout(() => onApiReady(api), 0);
								}
							});
						}
					}}
				/>
			)}
		</div>
	);
}

export const DocumentCanvas = memo(DocumentCanvasComponent);

// Keep Excalidraw sized on container/viewport changes
export function useExcalidrawResize(
	container: React.RefObject<HTMLElement | null>,
	apiRef: React.RefObject<ExcalidrawAPI | null>
) {
	useEffect(() => {
		if (!container?.current) return;
		let scheduled = false;
		const refresh = () => {
			if (scheduled) return;
			scheduled = true;
			requestAnimationFrame(() => {
				try {
					apiRef.current?.refresh?.();
				} finally {
					scheduled = false;
				}
			});
		};
		const ro = new ResizeObserver(() => refresh());
		try {
			ro.observe(container.current as Element);
		} catch {}
		const onWin = () => refresh();
		window.addEventListener("resize", onWin);
		try {
			window.visualViewport?.addEventListener?.("resize", onWin);
		} catch {}
		return () => {
			try {
				ro.disconnect();
			} catch {}
			window.removeEventListener("resize", onWin);
			try {
				window.visualViewport?.removeEventListener?.("resize", onWin);
			} catch {}
		};
	}, [container, apiRef]);
}
