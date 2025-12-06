import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getCustomerByWaId, getMockCustomers, saveMockCustomers } from '@/lib/mock-data'

type Params = { waId: string }

function isPromise<T>(value: unknown): value is Promise<T> {
	return (
		typeof value === 'object' && value !== null && 'then' in (value as object)
	)
}

async function resolveParams(
	ctx: { params: Params } | { params: Promise<Params> }
): Promise<Params> {
	const p = (ctx as { params: Params | Promise<Params> }).params
	return isPromise<Params>(p) ? await p : p
}

export async function GET(
	_req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> }
) {
	try {
		const { waId } = await resolveParams(ctx)
		const customer = getCustomerByWaId(waId)

		if (!customer) {
			return NextResponse.json({ success: true, data: null })
		}

		// Calculate effective age if age_recorded_at is present
		let effectiveAge = customer.age
		if (customer.age && customer.age_recorded_at) {
			const recorded = new Date(customer.age_recorded_at)
			const today = new Date()
			const years = today.getFullYear() - recorded.getFullYear()
			if (years > 0) {
				effectiveAge = Math.max(0, customer.age + years)
			}
		}

		return NextResponse.json({
			success: true,
			data: {
				wa_id: customer.wa_id,
				name: customer.customer_name,
				age: effectiveAge,
				age_recorded_at: customer.age_recorded_at,
				document: customer.document,
			},
		})
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 }
		)
	}
}

export async function PUT(
	req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> }
) {
	try {
		const { waId } = await resolveParams(ctx)
		const body = await req.json().catch(() => ({}))

		const customers = getMockCustomers()
		let customer = customers.find((c) => c.wa_id === waId)

		// Create customer if doesn't exist
		if (!customer) {
			customer = {
				wa_id: waId,
				customer_name: body.name || '',
				is_blocked: false,
				is_favorite: false,
			}
			customers.push(customer)
		}

		// Update fields
		if (body.name !== undefined) {
			customer.customer_name = body.name
		}
		if (body.age !== undefined) {
			customer.age = body.age
			customer.age_recorded_at = new Date().toISOString().split('T')[0]
		}
		if ('document' in body) {
			customer.document = body.document
		}

		saveMockCustomers(customers)

		return NextResponse.json({
			success: true,
			name: customer.customer_name,
			age: customer.age,
			document: customer.document,
		})
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 }
		)
	}
}
