// Lightweight API client - all routes call Python backend directly, bypassing Next.js proxy
import { i18n } from "@shared/libs/i18n";

type Json = Record<string, unknown>;

// Dedup/cache for fetchCustomer to avoid duplicate GETs in rapid succession
const customerFetchInFlight = new Map<string, Promise<Json>>();
const customerFetchCache = new Map<string, { at: number; data: Json }>();
const CUSTOMER_FETCH_TTL_MS = 1500; // small TTL to coalesce concurrent callers

export function getMessage(key: string, isLocalized?: boolean): string {
	return i18n.getMessage(key, isLocalized);
}

// === Conversations ===
export async function fetchConversations(): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend("/conversations")) as Json;
}

// === Reservations ===
export async function fetchReservations(options?: {
	future?: boolean;
	includeCancelled?: boolean;
	fromDate?: string;
	toDate?: string;
}): Promise<Json> {
	const params = new URLSearchParams();
	if (options?.future !== undefined) params.set("future", String(options.future));
	if (options?.includeCancelled !== undefined) params.set("include_cancelled", String(options.includeCancelled));
	if (options?.fromDate) params.set("from_date", options.fromDate);
	if (options?.toDate) params.set("to_date", options.toDate);
	const qs = params.toString();
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend(`/reservations${qs ? `?${qs}` : ""}`)) as Json;
}

export async function reserveTimeSlot(input: {
	id: string; // wa_id
	title: string; // customer_name
	date: string; // YYYY-MM-DD
	time: string; // 12h or 24h, backend accepts both
	type?: number; // 0/1
	max_reservations?: number; // default 6
	hijri?: boolean;
	ar?: boolean;
}): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend("/reserve", {
		method: "POST",
		body: JSON.stringify(input),
	})) as Json;
}

export async function modifyReservation(
	id: string, // wa_id
	updates: {
		date: string;
		time: string;
		title?: string;
		type?: number;
		approximate?: boolean;
		reservationId?: number;
	}
): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend("/modify-reservation", {
		method: "POST",
		body: JSON.stringify({ id, ...updates }),
	})) as Json;
}

export async function undoModifyReservation(input: {
	reservationId: number;
	originalData: {
		wa_id: string;
		date: string;
		time_slot: string;
		customer_name?: string;
		type?: number;
	};
	ar?: boolean;
}): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend("/reservations/undo-modify", {
		method: "POST",
		body: JSON.stringify(input),
	})) as Json;
}

export async function cancelReservation(input: {
	id: string; // wa_id
	date: string; // YYYY-MM-DD
	isLocalized?: boolean;
}): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend("/cancel-reservation", {
		method: "POST",
		body: JSON.stringify(input),
	})) as Json;
}

export async function fetchVacations(): Promise<Json> {
	const { callPythonBackend } = await import("@shared/libs/backend");
	return (await callPythonBackend("/vacations")) as Json;
}

// === Customers (documents) ===
export async function fetchCustomer(waId: string): Promise<Json> {
	const id = encodeURIComponent(waId);

	// Short-lived cache to avoid back-to-back GETs across separate call sites
	const cached = customerFetchCache.get(id);
	if (cached && Date.now() - cached.at < CUSTOMER_FETCH_TTL_MS) {
		try {
			console.log(`[API] ♻️ GET customers/${id} served from cache`);
		} catch {}
		return cached.data as Json;
	}

	// Join in-flight request if one exists for this id
	const existing = customerFetchInFlight.get(id);
	if (existing) {
		try {
			console.log(`[API] ⏳ GET customers/${id} dedup: joining in-flight request`);
		} catch {}
		return existing;
	}

	const task = (async () => {
		const startTime = performance.now();
		try {
			console.log(`[API] 🔍 GET customers/${id}`);
			// Use callPythonBackend to bypass Next.js proxy and call Python directly
			const { callPythonBackend } = await import("@shared/libs/backend");
			const result = (await callPythonBackend(`/customers/${id}`, {
				method: "GET",
			})) as Json;
			const elapsed = performance.now() - startTime;
			try {
				console.log(`[API] ✅ GET customers/${id} completed in ${elapsed.toFixed(1)}ms`, result);
			} catch {}
			// Populate short TTL cache
			customerFetchCache.set(id, { at: Date.now(), data: result });
			return result;
		} finally {
			// Ensure we always clear in-flight entry
			customerFetchInFlight.delete(id);
		}
	})();

	customerFetchInFlight.set(id, task);
	return task;
}

export async function saveCustomerDocument(input: {
	waId: string;
	document?: unknown;
	name?: string | null;
	age?: number | null;
	ar?: boolean;
}): Promise<Json> {
	const id = encodeURIComponent(input.waId);
	const { waId: _wa, ...body } = input;
	const payload = JSON.stringify(body);
	const startTime = performance.now();
	console.log(`[API] 🚀 PUT customers/${id}: size=${payload.length} bytes`);
	// Use callPythonBackend to bypass Next.js proxy and call Python directly
	const { callPythonBackend } = await import("@shared/libs/backend");
	const result = await callPythonBackend(`/customers/${id}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: payload,
	});
	const elapsed = performance.now() - startTime;
	console.log(`[API] ✅ PUT customers/${id} completed in ${elapsed.toFixed(1)}ms`);
	return result as Json;
}
