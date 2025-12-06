import { NextResponse } from 'next/server'
import {
	getMockReservations,
	saveMockReservations,
	getMockCustomers,
	saveMockCustomers,
	getNextId,
} from '@/lib/mock-data'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { id, title, date, time, type } = body

		// Validate required fields
		if (!(id && title && date && time)) {
			return NextResponse.json(
				{
					success: false,
					message: 'Missing required fields: id, title, date, time',
				},
				{ status: 400 }
			)
		}

		const reservations = getMockReservations()
		const customers = getMockCustomers()

		// Ensure customer exists
		let customer = customers.find((c) => c.wa_id === id)
		if (!customer) {
			customer = {
				wa_id: id,
				customer_name: title,
				is_blocked: false,
				is_favorite: false,
			}
			customers.push(customer)
			saveMockCustomers(customers)
		} else if (customer.customer_name !== title) {
			customer.customer_name = title
			saveMockCustomers(customers)
		}

		// Create new reservation
		const now = new Date().toISOString()
		const newReservation = {
			id: getNextId(reservations),
			wa_id: id,
			customer_name: title,
			date,
			time_slot: time,
			type: type || 0,
			status: 'active' as const,
			created_at: now,
			updated_at: now,
		}

		reservations.push(newReservation)
		saveMockReservations(reservations)

		return NextResponse.json({
			success: true,
			data: {
				reservation_id: newReservation.id,
				gregorian_date: date,
				time_slot: time,
				type: newReservation.type,
			},
			message: 'Reservation created successfully',
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to create reservation: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
