/**
 * Template document copy logic
 *
 * Handles copying the default template document to new users on first document open.
 */

import { fetchCustomer, saveCustomerDocument } from "@/shared/libs/api";
import { TEMPLATE_USER_WA_ID } from "./default-document";

// Deduplicate concurrent initialization attempts per waId
const initInFlight = new Map<string, Promise<boolean>>();

/**
 * Checks if a user's document has been initialized.
 * A document is considered initialized if:
 * 1. The user exists in the database
 * 2. The user has a non-null document field
 */
export async function isDocumentInitialized(waId: string): Promise<boolean> {
	try {
		console.log(`[TemplateCheck] Checking if document is initialized for waId=${waId}`);
		const result = (await fetchCustomer(waId)) as unknown as {
			data?: { document?: unknown };
			document?: unknown;
		};
		const rawDoc = (result?.data?.document as unknown) ?? (result?.document as unknown) ?? null;
		const doc = rawDoc as { elements?: unknown[] } | null | undefined;
		const hasElements = Array.isArray(doc?.elements) ? (doc?.elements as unknown[])?.length > 0 : false;
		const hasDocument = Boolean(doc !== null && doc !== undefined);
		const initialized = Boolean(hasDocument && hasElements);
		console.log(
			`[TemplateCheck] waId=${waId}, hasDocument=${hasDocument}, hasElements=${hasElements}, initialized=${initialized}`
		);
		return initialized;
	} catch (error) {
		console.warn(`[TemplateCheck] Error checking document for waId=${waId}:`, error);
		// If user doesn't exist or error, assume not initialized
		return false;
	}
}

/**
 * Copies the template document from TEMPLATE_USER to a target user.
 * This should be called when a user opens their document for the first time.
 */
export async function copyTemplateToUser(waId: string): Promise<boolean> {
	try {
		console.log(`[TemplateCopy] Starting template copy to waId=${waId}`);

		// 1. Fetch the template document
		const templateResp = (await fetchCustomer(TEMPLATE_USER_WA_ID)) as unknown as { data?: { document?: unknown } };
		const templateDoc = (templateResp?.data?.document ?? null) as {
			elements?: unknown[];
		} | null;

		const templateHasElements = Array.isArray(templateDoc?.elements)
			? (templateDoc?.elements as unknown[])?.length > 0
			: false;
		if (!templateDoc || !templateHasElements) {
			console.warn(
				`[TemplateCopy] No template document found (or empty), skipping copy. elements=${Array.isArray(templateDoc?.elements) ? (templateDoc?.elements as unknown[]).length : 0}`
			);
			return false;
		}

		console.log("[TemplateCopy] Fetched template document");

		// 2. Save it to the target user
		const result = await saveCustomerDocument({
			waId,
			document: templateDoc,
		});

		const success = Boolean((result as { success?: unknown })?.success) !== false;
		console.log(`[TemplateCopy] Copy ${success ? "succeeded" : "failed"} for waId=${waId}`);

		// Proactively broadcast a local external-update so the UI can render immediately
		if (success) {
			try {
				window.dispatchEvent(
					new CustomEvent("documents:external-update", {
						detail: { wa_id: waId, document: templateDoc },
					})
				);
				console.log(
					`[TemplateCopy] 🔔 dispatched local external-update for waId=${waId} (elements=${Array.isArray(templateDoc?.elements) ? (templateDoc?.elements as unknown[]).length : 0})`
				);
			} catch (err) {
				console.warn("[TemplateCopy] Warning: failed to dispatch local external-update:", err);
			}
		}

		return success;
	} catch (error) {
		console.error(`[TemplateCopy] Error copying template to waId=${waId}:`, error);
		return false;
	}
}

/**
 * Ensures a user's document is initialized with the template if needed.
 * Returns true if document is ready (either already exists or was successfully copied).
 */
export async function ensureDocumentInitialized(waId: string): Promise<boolean> {
	// Don't try to initialize the blank document or template user
	if (!waId || waId === "" || waId === TEMPLATE_USER_WA_ID) {
		return true;
	}

	// Coalesce concurrent callers
	const existing = initInFlight.get(waId);
	if (existing) return existing;

	const task = (async (): Promise<boolean> => {
		const initialized = await isDocumentInitialized(waId);

		if (initialized) {
			console.log(`[TemplateInit] Document already initialized for waId=${waId}`);
			return true;
		}

		console.log(`[TemplateInit] Document not initialized, copying template for waId=${waId}`);
		const copied = await copyTemplateToUser(waId);

		if (!copied) {
			console.warn(`[TemplateInit] Failed to copy template for waId=${waId}`);
		}
		return copied;
	})();

	initInFlight.set(waId, task);
	try {
		return await task;
	} finally {
		initInFlight.delete(waId);
	}
}
