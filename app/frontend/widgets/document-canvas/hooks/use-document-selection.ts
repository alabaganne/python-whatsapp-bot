"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ensureDocumentInitialized } from "@/shared/libs/documents";

const DEFAULT_DOCUMENT_WA_ID = "";

/**
 * Hook to manage document waId selection from multiple sources:
 * - URL parameters (initial page load with ?waId=xxx)
 * - Custom events (doc:user-select from calendar/phone picker)
 * - Initial blank document state
 *
 * Handles all guard logic for preventing spurious autosaves during document switches
 */
export function useDocumentSelection(options?: {
	ignorePersistUntilRef?: { current: number };
	persistTimerRef?: { current: number | null };
	pendingInitialLoadWaIdRef?: { current: string | null };
}) {
	const searchParams = useSearchParams();
	const [waId, setWaId] = useState<string>(DEFAULT_DOCUMENT_WA_ID);

	const { ignorePersistUntilRef, persistTimerRef, pendingInitialLoadWaIdRef } = options || {};

	// Initialize waId - start with default (blank) on fresh page load
	useEffect(() => {
		console.log("[useDocumentSelection] 🏁 Page initialized, starting with blank document");
		if (pendingInitialLoadWaIdRef) {
			pendingInitialLoadWaIdRef.current = DEFAULT_DOCUMENT_WA_ID;
		}
		setWaId(DEFAULT_DOCUMENT_WA_ID);
	}, [pendingInitialLoadWaIdRef]);

	// Check for waId in URL parameters and load that customer's document
	useEffect(() => {
		const urlWaId = searchParams.get("waId");
		if (urlWaId && urlWaId !== DEFAULT_DOCUMENT_WA_ID) {
			console.log(`[useDocumentSelection] 🔗 Loading document from URL parameter: waId=${urlWaId}`);
			// Guard: briefly suppress persist while switching customers
			if (ignorePersistUntilRef) {
				ignorePersistUntilRef.current = Date.now() + 900;
			}
			if (persistTimerRef?.current) {
				clearTimeout(persistTimerRef.current);
				persistTimerRef.current = null;
			}
			// Guard: suppress autosave dirty state during document switch
			try {
				(globalThis as { __docIgnoreChangesUntil?: number }).__docIgnoreChangesUntil = Date.now() + 1500;
			} catch {}
			// Mark this waId as pending initial load
			if (pendingInitialLoadWaIdRef) {
				pendingInitialLoadWaIdRef.current = urlWaId;
			}
			// Initialize the customer's document with template on first selection
			void ensureDocumentInitialized(urlWaId);
			setWaId(urlWaId);
		}
	}, [searchParams, ignorePersistUntilRef, persistTimerRef, pendingInitialLoadWaIdRef]);

	// Handle customer selection from grid phone or drawer calendar
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { waId?: string };
				const next = String(detail?.waId || "");
				if (!next) return;
				// Guard: briefly suppress persist while switching customers
				if (ignorePersistUntilRef) {
					ignorePersistUntilRef.current = Date.now() + 900;
				}
				if (persistTimerRef?.current) {
					clearTimeout(persistTimerRef.current);
					persistTimerRef.current = null;
				}
				// Guard: suppress autosave dirty state during document switch
				try {
					(globalThis as { __docIgnoreChangesUntil?: number }).__docIgnoreChangesUntil = Date.now() + 1500;
				} catch {}
				// Mark this waId as pending initial load
				console.log(
					`[useDocumentSelection] 🔄 Switching to new document waId=${next}, marking as pending initial load`
				);
				if (pendingInitialLoadWaIdRef) {
					pendingInitialLoadWaIdRef.current = next;
				}
				// Initialize the customer's document with template on first selection
				console.log(`[useDocumentSelection] 🔁 ensureDocumentInitialized called from selection: waId=${next}`);
				void ensureDocumentInitialized(next);
				setWaId(next);
			} catch {}
		};
		window.addEventListener("doc:user-select", handler as EventListener);
		return () => window.removeEventListener("doc:user-select", handler as EventListener);
	}, [ignorePersistUntilRef, persistTimerRef, pendingInitialLoadWaIdRef]);

	return {
		waId,
		setWaId,
	} as const;
}
