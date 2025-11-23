import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getMockReservations, type MockReservation } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const future = url.searchParams.get('future') === 'true'
		const includeCancelled =
			url.searchParams.get('include_cancelled') === 'true'
		const fromDate = url.searchParams.get('from_date') // YYYY-MM-DD format
		const toDate = url.searchParams.get('to_date') // YYYY-MM-DD format

		let reservations = getMockReservations()

		// Filter by status
		if (!includeCancelled) {
			reservations = reservations.filter((r) => r.status === 'active')
		}

		// Filter by date range
		const today = new Date().toISOString().split('T')[0]
		if (future) {
			reservations = reservations.filter((r) => r.date >= today)
		}
		if (fromDate) {
			reservations = reservations.filter((r) => r.date >= fromDate)
		}
		if (toDate) {
			reservations = reservations.filter((r) => r.date <= toDate)
		}

		// Group by date (matching backend format)
		const grouped: Record<string, MockReservation[]> = {}
		for (const reservation of reservations) {
			if (!grouped[reservation.date]) {
				grouped[reservation.date] = []
			}
			grouped[reservation.date].push(reservation)
		}

		return NextResponse.json({ success: true, data: grouped })
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to fetch reservations: ${error instanceof Error ? error.message : 'Unknown error'}`,
				data: {},
			},
			{ status: 500 }
		)
	}
}
