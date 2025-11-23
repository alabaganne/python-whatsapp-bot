import { NextResponse } from 'next/server'
import {
	getMockReservations,
	saveMockReservations,
	getMockCustomers,
	saveMockCustomers,
} from '@/lib/mock-data'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { id, date, time, title, type, reservationId } = body

		// Validate required fields
		if (!(id && date && time)) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields: id, date, time' },
				{ status: 400 }
			)
		}

		const reservations = getMockReservations()

		// Find the reservation to modify
		let reservation
		if (reservationId) {
			reservation = reservations.find((r) => r.id === reservationId && r.wa_id === id)
		} else {
			// Find the first active reservation for this customer
			reservation = reservations.find((r) => r.wa_id === id && r.status === 'active')
		}

		if (!reservation) {
			return NextResponse.json(
				{ success: false, message: 'Reservation not found' },
				{ status: 404 }
			)
		}

		// Store original data for response
		const originalData = {
			date: reservation.date,
			time_slot: reservation.time_slot,
			customer_name: reservation.customer_name,
			type: reservation.type,
		}

		// Update reservation
		reservation.date = date
		reservation.time_slot = time
		if (title) {
			reservation.customer_name = title
		}
		if (type !== undefined) {
			reservation.type = type
		}
		reservation.updated_at = new Date().toISOString()

		saveMockReservations(reservations)

		// Update customer name if provided
		if (title) {
			const customers = getMockCustomers()
			const customer = customers.find((c) => c.wa_id === id)
			if (customer) {
				customer.customer_name = title
				saveMockCustomers(customers)
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Reservation modified successfully',
			data: {
				reservation_id: reservation.id,
				gregorian_date: reservation.date,
				time_slot: reservation.time_slot,
				type: reservation.type,
				customer_name: reservation.customer_name,
				original_data: originalData,
			},
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to modify reservation: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
