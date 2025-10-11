"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic hook for managing fullscreen state for any container element
 * @param options Configuration options for fullscreen behavior
 * @returns Fullscreen state and control functions
 */
export function useFullscreen(options?: {
	/** Callback when fullscreen state changes */
	onFullscreenChange?: (isFullscreen: boolean) => void;
	/** Suppress autosave or other operations during fullscreen transition */
	suppressChangesMs?: number;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const { onFullscreenChange, suppressChangesMs = 800 } = options || {};

	// Listen for fullscreen changes
	useEffect(() => {
		const handleFullscreenChange = () => {
			const fullscreenActive = Boolean(document.fullscreenElement);
			setIsFullscreen(fullscreenActive);

			// Notify callback if provided
			onFullscreenChange?.(fullscreenActive);

			// Guard: suppress autosave dirty state during fullscreen transition
			// Useful for canvas/rich editors that may fire onChange due to resize
			if (suppressChangesMs > 0) {
				try {
					(globalThis as { __docIgnoreChangesUntil?: number }).__docIgnoreChangesUntil = Date.now() + suppressChangesMs;
				} catch {}
			}
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, [onFullscreenChange, suppressChangesMs]);

	const enterFullscreen = useCallback(() => {
		try {
			const el = containerRef.current;
			if (!el) return;
			if (document.fullscreenElement) return;
			void el.requestFullscreen?.();
		} catch {}
	}, []);

	const exitFullscreen = useCallback(() => {
		try {
			if (!document.fullscreenElement) return;
			void document.exitFullscreen?.();
		} catch {}
	}, []);

	return {
		isFullscreen,
		enterFullscreen,
		exitFullscreen,
		containerRef,
	} as const;
}
