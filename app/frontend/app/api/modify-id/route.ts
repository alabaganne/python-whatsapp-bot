import { NextResponse } from 'next/server'
import {
	getMockCustomers,
	saveMockCustomers,
	getMockReservations,
	saveMockReservations,
	getMockConversations,
	saveMockConversations,
} from '@/lib/mock-data'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { old_id, new_id, customer_name } = body

		// Validate required fields
		if (!(old_id && new_id)) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields: old_id, new_id' },
				{ status: 400 }
			)
		}

		const customers = getMockCustomers()
		const reservations = getMockReservations()
		const conversations = getMockConversations()

		// Update customer
		const customer = customers.find((c) => c.wa_id === old_id)
		if (customer) {
			customer.wa_id = new_id
			if (customer_name) {
				customer.customer_name = customer_name
			}
		}

		// Update reservations
		for (const reservation of reservations) {
			if (reservation.wa_id === old_id) {
				reservation.wa_id = new_id
				if (customer_name) {
					reservation.customer_name = customer_name
				}
			}
		}

		// Update conversations
		if (conversations[old_id]) {
			const oldConversations = conversations[old_id]
			for (const conv of oldConversations) {
				conv.wa_id = new_id
			}
			conversations[new_id] = oldConversations
			delete conversations[old_id]
		}

		saveMockCustomers(customers)
		saveMockReservations(reservations)
		saveMockConversations(conversations)

		return NextResponse.json({
			success: true,
			message: 'Customer ID modified successfully',
			data: {
				wa_id: new_id,
				customer_name: customer_name || customer?.customer_name,
			},
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to modify customer ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
