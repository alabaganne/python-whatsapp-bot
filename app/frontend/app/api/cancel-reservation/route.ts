import { NextResponse } from 'next/server'
import { getMockReservations, saveMockReservations } from '@/lib/mock-data'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { id, date } = body

		// Validate required fields
		if (!(id && date)) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields: id, date' },
				{ status: 400 }
			)
		}

		const reservations = getMockReservations()

		// Find and cancel reservations for this customer and date
		const cancelledIds: number[] = []
		let found = false

		for (const reservation of reservations) {
			if (reservation.wa_id === id && reservation.date === date && reservation.status === 'active') {
				reservation.status = 'cancelled'
				reservation.cancelled_at = new Date().toISOString()
				reservation.updated_at = new Date().toISOString()
				cancelledIds.push(reservation.id)
				found = true
			}
		}

		if (!found) {
			return NextResponse.json(
				{ success: false, message: 'No active reservation found for this date' },
				{ status: 404 }
			)
		}

		saveMockReservations(reservations)

		return NextResponse.json({
			success: true,
			message: 'Reservation(s) cancelled successfully',
			data: { cancelled_ids: cancelledIds },
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to cancel reservation: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
