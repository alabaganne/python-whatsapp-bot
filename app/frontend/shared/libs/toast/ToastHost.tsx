"use client";

import { Z_INDEX } from "@shared/libs/ui/z-index";
import type * as React from "react";
import { Toaster } from "sonner";

export function ToastHost(): React.JSX.Element {
	return (
		<Toaster
			position="bottom-right"
			gap={8}
			style={{ zIndex: Z_INDEX.TOASTER }}
			toastOptions={{
				className: "sonner-toast",
				descriptionClassName: "sonner-description",
				style: {
					background: "transparent",
					border: "none",
					// @ts-expect-error custom css var forwarded to CSS
					"--toaster-z": Z_INDEX.TOASTER,
				},
				classNames: {
					toast: "sonner-toast group",
					title: "sonner-title",
					description: "sonner-description",
					actionButton: "sonner-action",
					cancelButton: "sonner-cancel",
					closeButton: "sonner-close",
					error: "sonner-error",
					success: "sonner-success",
					warning: "sonner-warning",
					info: "sonner-info",
				},
			}}
		/>
	);
}
