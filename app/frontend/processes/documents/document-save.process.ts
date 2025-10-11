/*
 * Document save orchestration utilities
 * - Centralizes signature computation, normalization, idle debounced save, and interval autosave
 */

import { saveCustomerDocument } from "@/shared/libs/api/index";
import { computeSceneSignature, normalizeForPersist } from "@/shared/libs/documents/scene-utils";

type Json = Record<string, unknown>;

export interface DocumentPayload {
	waId: string;
	elements: unknown[];
	appState: Record<string, unknown>;
	files: Record<string, unknown>;
	viewerAppState?: Record<string, unknown>;
	editorAppState?: Record<string, unknown>;
}

export interface SaveResult {
	success: boolean;
	message?: string;
	[id: string]: unknown;
}

export function computeDocumentSignature(payload: Omit<DocumentPayload, "waId">): string {
	try {
		return computeSceneSignature(payload.elements, payload.appState, payload.files);
	} catch {
		return "";
	}
}

export async function saveDocumentOnce(payload: DocumentPayload): Promise<SaveResult> {
	try {
		try {
			console.log(
				`[saveOnce] ▶️ begin: waId=${payload.waId}, elements=${Array.isArray(payload.elements) ? payload.elements.length : "?"}, hasViewerCamera=${!!payload.viewerAppState}, hasEditorCamera=${!!payload.editorAppState}`
			);
		} catch {}
		const body = normalizeForPersist(
			payload.elements,
			payload.appState,
			payload.files,
			payload.viewerAppState,
			payload.editorAppState
		);
		const res = (await saveCustomerDocument({
			waId: payload.waId,
			document: body,
		})) as Json;
		try {
			console.log(`[saveOnce] ✅ success: waId=${payload.waId}, serverKeys=${Object.keys(res || {}).join(",")}`);
		} catch {}
		return {
			success: Boolean((res as { success?: unknown })?.success) !== false,
			...res,
		} as SaveResult;
	} catch (e) {
		try {
			console.warn(`[saveOnce] ❌ error: waId=${payload.waId}, message=${(e as Error)?.message || "unknown"}`);
		} catch {}
		return { success: false, message: (e as Error)?.message } as SaveResult;
	}
}

export interface IdleAutosaveControllerOptions {
	waId: string;
	idleMs?: number; // default 3000
	/** Called right before a save attempt begins */
	onSaving?: (args: { waId: string }) => void;
	/** Optional fan-out after successful save */
	onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
	/** Called when a save attempt fails */
	onError?: (args: { waId: string; message?: string }) => void;
}

export function createIdleAutosaveController(options: IdleAutosaveControllerOptions) {
	const { waId, idleMs = 3000, onSaving, onSaved, onError } = options;
	let timer: number | null = null;
	let lastSavedSig: string | null = null;
	let lastPendingSig: string | null = null;

	function cancel(): void {
		if (timer) {
			window.clearTimeout(timer);
			timer = null;
			console.log(
				`[autosave] ⛔ idle cancel: waId=${waId}, cleared timer (pendingSig was ${lastPendingSig ? lastPendingSig.slice(0, 40) : "<none>"})`
			);
		}
		// Prevent late flush for previous waId
		lastPendingSig = null;
		pendingPayload = null;
	}

	async function flush(payload: Omit<DocumentPayload, "waId"> & { sig?: string }): Promise<SaveResult | null> {
		// Create combined signature: content + viewer camera + editor camera
		const contentSig = computeDocumentSignature(payload);
		let viewerSig = "";
		if (payload.viewerAppState) {
			try {
				const zoomValue = (payload.viewerAppState.zoom as { value?: number })?.value ?? 1;
				const scrollX = (payload.viewerAppState.scrollX as number) ?? 0;
				const scrollY = (payload.viewerAppState.scrollY as number) ?? 0;
				viewerSig = JSON.stringify({
					zoom: Math.round(zoomValue * 1000) / 1000,
					scrollX: Math.round(scrollX),
					scrollY: Math.round(scrollY),
				});
			} catch {}
		}
		let editorSig = "";
		if (payload.editorAppState) {
			try {
				const zoomValue = (payload.editorAppState.zoom as { value?: number })?.value ?? 1;
				const scrollX = (payload.editorAppState.scrollX as number) ?? 0;
				const scrollY = (payload.editorAppState.scrollY as number) ?? 0;
				editorSig = JSON.stringify({
					zoom: Math.round(zoomValue * 1000) / 1000,
					scrollX: Math.round(scrollX),
					scrollY: Math.round(scrollY),
				});
			} catch {}
		}
		const combinedSig = `${contentSig}|viewer:${viewerSig}|editor:${editorSig}`;

		if (!combinedSig || combinedSig === lastSavedSig) {
			try {
				console.log(
					`[autosave] ⏭️ idle flush skipped: waId=${waId}, contentSig=${contentSig ? contentSig.slice(0, 8) : "<empty>"}, viewerSig=${viewerSig.slice(0, 20)}, editorSig=${editorSig.slice(0, 20)}, lastSavedSig=${lastSavedSig ? lastSavedSig.slice(0, 60) : "<none>"}`
				);
			} catch {}
			return null;
		}
		try {
			console.log(
				`[autosave] 💾 idle flush begin: waId=${waId}, contentSig=${contentSig.slice(0, 8)}, viewerSig=${viewerSig.slice(0, 20)}, editorSig=${editorSig.slice(0, 20)}`
			);
			onSaving?.({ waId });
		} catch {}
		const res = await saveDocumentOnce({ waId, ...payload });
		if (res?.success) {
			lastSavedSig = combinedSig;
			try {
				// Record last successful save time globally (per waId)
				const g = globalThis as unknown as {
					__docLastSavedAt?: Record<string, number>;
				};
				g.__docLastSavedAt = g.__docLastSavedAt || {};
				g.__docLastSavedAt[waId] = Date.now();
			} catch {}
			try {
				const scene = normalizeForPersist(
					payload.elements,
					payload.appState,
					payload.files,
					payload.viewerAppState,
					payload.editorAppState
				) as Record<string, unknown>;
				onSaved?.({ waId, scene });
				// Best-effort local broadcast
				window.dispatchEvent(
					new CustomEvent("documents:sceneApplied", {
						detail: { wa_id: waId, scene },
					})
				);
				console.log(
					`[autosave] ✅ idle flush success: waId=${waId}, contentSig=${contentSig.slice(0, 8)}, viewerSig=${viewerSig.slice(0, 20)}, editorSig=${editorSig.slice(0, 20)}, hasViewerCamera=${!!payload.viewerAppState}, hasEditorCamera=${!!payload.editorAppState}`
				);
			} catch {}
		} else {
			try {
				console.warn(
					`[autosave] ❌ idle flush failed: waId=${waId}, message=${(res as { message?: string })?.message || "unknown"}`
				);
				const errorMessage = (res as { message?: string })?.message;
				if (errorMessage !== undefined) {
					onError?.({ waId, message: errorMessage });
				} else {
					onError?.({ waId });
				}
			} catch {}
		}
		return res;
	}

	// Store pending payload to avoid recomputing signatures on every schedule call
	let pendingPayload: (Omit<DocumentPayload, "waId"> & { sig?: string }) | null = null;

	function schedule(payload: Omit<DocumentPayload, "waId"> & { sig?: string }): void {
		// Store the payload for later flushing
		pendingPayload = payload;

		// If timer already exists, just update the payload and let existing timer fire
		// This avoids constant timer cancellation/recreation overhead
		if (timer !== null) {
			return;
		}

		// Defer signature computation to flush time - just set a lightweight flag
		lastPendingSig = "pending";

		timer = window.setTimeout(() => {
			timer = null;
			const currentPayload = pendingPayload;
			if (currentPayload) {
				// Compute signatures only at flush time, not on every keystroke
				const contentSig = "";
				let viewerSig = "";
				if (currentPayload.viewerAppState) {
					try {
						const zoomValue = (currentPayload.viewerAppState.zoom as { value?: number })?.value ?? 1;
						const scrollX = (currentPayload.viewerAppState.scrollX as number) ?? 0;
						const scrollY = (currentPayload.viewerAppState.scrollY as number) ?? 0;
						viewerSig = JSON.stringify({
							zoom: Math.round(zoomValue * 1000) / 1000,
							scrollX: Math.round(scrollX),
							scrollY: Math.round(scrollY),
						});
					} catch {}
				}
				let editorSig = "";
				if (currentPayload.editorAppState) {
					try {
						const zoomValue = (currentPayload.editorAppState.zoom as { value?: number })?.value ?? 1;
						const scrollX = (currentPayload.editorAppState.scrollX as number) ?? 0;
						const scrollY = (currentPayload.editorAppState.scrollY as number) ?? 0;
						editorSig = JSON.stringify({
							zoom: Math.round(zoomValue * 1000) / 1000,
							scrollX: Math.round(scrollX),
							scrollY: Math.round(scrollY),
						});
					} catch {}
				}
				const computedSig = `${contentSig ? contentSig : "rev"}|viewer:${viewerSig}|editor:${editorSig}`;

				if (computedSig !== lastSavedSig) {
					void flush(currentPayload);
				}
			}
			lastPendingSig = null;
			pendingPayload = null;
		}, idleMs);
	}

	return { schedule, cancel, flushImmediate: flush } as const;
}

export interface IntervalAutosaveControllerOptions {
	waId: string;
	intervalMs?: number; // default 15000
	/** Called right before a save attempt begins (interval) */
	onSaving?: (args: { waId: string }) => void;
	/** Optional fan-out after successful save (interval) */
	onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
	/** Called when a save attempt fails (interval) */
	onError?: (args: { waId: string; message?: string }) => void;
}

export function createIntervalAutosaveController(options: IntervalAutosaveControllerOptions) {
	const { waId, intervalMs = 15000, onSaving, onSaved, onError } = options;
	let id: number | null = null;
	let lastSavedSig: string | null = null;

	function stop(): void {
		if (id) {
			window.clearInterval(id);
			id = null;
		}
		try {
			console.log(`[autosave] ⛔ interval stopped: waId=${waId}`);
		} catch {}
	}

	function start(getters: {
		getElements: () => unknown[];
		getAppState: () => Record<string, unknown>;
		getFiles: () => Record<string, unknown>;
	}): void {
		stop();
		id = window.setInterval(async () => {
			try {
				// Throttle: skip if any save occurred within the last intervalMs
				try {
					const g = globalThis as unknown as {
						__docLastSavedAt?: Record<string, number>;
					};
					const lastAt = g.__docLastSavedAt?.[waId] || 0;
					if (lastAt && Date.now() - lastAt < intervalMs) {
						console.log(`[autosave] ⏭️ interval skip (recent save ${Date.now() - lastAt}ms ago): waId=${waId}`);
						return;
					}
				} catch {}
				const elements = getters.getElements();
				const appState = getters.getAppState();
				const files = getters.getFiles();
				const sig = computeDocumentSignature({ elements, appState, files });
				if (!sig) {
					console.log(`[autosave] ⏭️ interval skip (empty sig): waId=${waId}`);
					return;
				}
				if (sig === lastSavedSig) {
					// Quietly skip unchanged
					return;
				}
				console.log(`[autosave] 💓 interval attempt: waId=${waId}, sig=${sig.slice(0, 8)}`);
				try {
					onSaving?.({ waId });
				} catch {}
				const res = await saveDocumentOnce({ waId, elements, appState, files });
				if ((res as { success?: boolean })?.success !== false) {
					lastSavedSig = sig;
					try {
						const g = globalThis as unknown as {
							__docLastSavedAt?: Record<string, number>;
						};
						g.__docLastSavedAt = g.__docLastSavedAt || {};
						g.__docLastSavedAt[waId] = Date.now();
					} catch {}
					console.log(`[autosave] ✅ interval success: waId=${waId}, sig=${sig.slice(0, 8)}`);
					try {
						// Note: interval autosave doesn't have access to viewerAppState
						// Only idle autosave (triggered by onChange) includes viewer camera
						const scene = normalizeForPersist(elements, appState, files) as Record<string, unknown>;
						onSaved?.({ waId, scene });
						window.dispatchEvent(
							new CustomEvent("documents:sceneApplied", {
								detail: { wa_id: waId, scene },
							})
						);
					} catch {}
				} else {
					console.warn(
						`[autosave] ❌ interval failed: waId=${waId}, message=${(res as { message?: string })?.message || "unknown"}`
					);
					try {
						const errorMessage = (res as { message?: string })?.message;
						if (errorMessage !== undefined) {
							onError?.({ waId, message: errorMessage });
						} else {
							onError?.({ waId });
						}
					} catch {}
				}
			} catch {}
		}, intervalMs);
		try {
			console.log(`[autosave] ▶️ interval started: waId=${waId}, every=${intervalMs}ms`);
		} catch {}
	}

	return { start, stop } as const;
}
