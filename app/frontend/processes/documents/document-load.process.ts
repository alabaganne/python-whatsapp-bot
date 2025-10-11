/*
 * Document load orchestration utilities
 * - Centralizes WebSocket request and optional await for first update
 */

import { WebSocketService } from "@/services/websocket/websocket.service";

export async function requestDocumentLoad(waId: string): Promise<boolean> {
	try {
		const ws = new WebSocketService();
		const ok = await ws.sendMessage({
			type: "get_customer_document",
			data: { wa_id: waId },
		});
		return Boolean(ok);
	} catch (err) {
		console.error(`[requestDocumentLoad] ❌ Error requesting document for waId=${waId}:`, err);
		return false;
	}
}

export function waitForNextDocumentUpdate(
	waId: string,
	timeoutMs = 8000
): Promise<{
	wa_id?: string;
	document?: Record<string, unknown> | null;
	scene?: Record<string, unknown> | null;
} | null> {
	return new Promise((resolve) => {
		let done = false;
		const finalize = (value: unknown) => {
			if (done) return;
			done = true;
			try {
				window.removeEventListener("documents:external-update", listener as unknown as EventListener);
			} catch {}
			clearTimeout(timer);
			resolve(value as unknown as null);
		};

		const listener = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					document?: Record<string, unknown> | null;
					scene?: Record<string, unknown> | null;
				};
				if (String(detail?.wa_id || "") !== String(waId)) return;
				finalize(detail);
			} catch {}
		};

		window.addEventListener("documents:external-update", listener as unknown as EventListener);

		const timer = window.setTimeout(() => finalize(null), timeoutMs);
	});
}
