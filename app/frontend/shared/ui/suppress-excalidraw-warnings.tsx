"use client";

import { useEffect } from "react";

/**
 * Suppresses known Excalidraw dev-only warnings that are harmless in production.
 * Excalidraw's internal gesture handlers can schedule state updates during render
 * in React 18, which triggers a warning but doesn't affect functionality.
 */
export function SuppressExcalidrawWarnings() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") return;

		const originalError = console.error;
		const originalWarn = console.warn;

		console.error = (...args: unknown[]) => {
			// Check all arguments, not just the first one
			const allArgs = args.map((arg) => String(arg)).join(" ");
			const msg = String(args[0] || "");

			// Suppress the "update scheduled from inside an update function" warning
			// when it comes from Excalidraw's _App component during gestures
			if (
				msg.includes("update") &&
				msg.includes("scheduled") &&
				msg.includes("inside an update function") &&
				msg.includes("Update functions should be pure")
			) {
				// Additional check: suppress if it's related to Excalidraw/canvas interactions
				if (
					allArgs.includes("_App") ||
					allArgs.includes("Excalidraw") ||
					allArgs.includes("DocumentCanvas") ||
					allArgs.includes("excalidraw")
				) {
					return;
				}
			}
			originalError.apply(console, args);
		};

		console.warn = (...args: unknown[]) => {
			// Check all arguments, not just the first one
			const allArgs = args.map((arg) => String(arg)).join(" ");
			const msg = String(args[0] || "");

			// Suppress Excalidraw-related update warnings
			if (
				msg.includes("update") &&
				msg.includes("scheduled") &&
				msg.includes("inside an update function") &&
				msg.includes("Update functions should be pure")
			) {
				// Additional check: suppress if it's related to Excalidraw/canvas interactions
				if (
					allArgs.includes("_App") ||
					allArgs.includes("Excalidraw") ||
					allArgs.includes("DocumentCanvas") ||
					allArgs.includes("excalidraw")
				) {
					return;
				}
			}
			originalWarn.apply(console, args);
		};

		return () => {
			console.error = originalError;
			console.warn = originalWarn;
		};
	}, []);

	return null;
}
