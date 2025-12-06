import { NextResponse } from 'next/server'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { wa_id, typing } = body ?? {}

		if (!wa_id || typeof typing !== 'boolean') {
			return NextResponse.json(
				{ success: false, message: 'Missing or invalid fields: wa_id, typing' },
				{ status: 400 }
			)
		}

		// In UI-only mode, typing indicators are not sent to WhatsApp
		// Just return success so the UI works
		return NextResponse.json({ success: true, typing })
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to send typing indicator: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
