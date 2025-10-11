import { NextResponse } from "next/server";

// Very small Prometheus text parser for a known subset of metrics
function parsePrometheusText(text: string): Record<string, number> {
	const lines = text.split(/\r?\n/);
	const values: Record<string, number> = {};
	const wanted = new Set([
		"process_cpu_percent",
		"process_memory_bytes",
		"reservations_requested_total",
		"reservations_successful_total",
		"reservations_failed_total",
		"reservations_cancellation_requested_total",
		"reservations_cancellation_successful_total",
		"reservations_cancellation_failed_total",
		"reservations_modification_requested_total",
		"reservations_modification_successful_total",
		"reservations_modification_failed_total",
	]);

	for (const raw of lines) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		// format: metric_name{labels} value OR metric_name value
		const spaceIdx = line.lastIndexOf(" ");
		if (spaceIdx <= 0) continue;
		const lhs = line.slice(0, spaceIdx);
		const rhs = line.slice(spaceIdx + 1);
		const name = lhs.includes("{") ? lhs.slice(0, lhs.indexOf("{")) : lhs;
		if (!wanted.has(name)) continue;
		const num = Number(rhs);
		if (!Number.isFinite(num)) continue;
		values[name] = num;
	}
	return values;
}

export async function GET() {
	try {
		const candidates = ["http://backend:8000", "http://localhost:8000"];
		let lastError: unknown;
		for (const base of candidates) {
			try {
				const res = await fetch(`${base}/metrics`, {
					method: "GET",
					headers: { Accept: "text/plain" },
					cache: "no-store",
				});
				if (!res.ok) continue;
				const text = await res.text();
				const data = parsePrometheusText(text);
				return NextResponse.json({ success: true, data });
			} catch (err) {
				lastError = err;
			}
		}
		return NextResponse.json(
			{
				success: false,
				message: (lastError as Error | undefined)?.message || "Metrics fetch failed",
				data: {},
			},
			{ status: 500 }
		);
	} catch (error) {
		return NextResponse.json({ success: false, message: (error as Error).message, data: {} }, { status: 500 });
	}
}
