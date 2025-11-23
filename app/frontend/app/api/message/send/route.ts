import { NextResponse } from 'next/server'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { wa_id, text } = body

		// Validate required fields
		if (!(wa_id && text)) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields: wa_id, text' },
				{ status: 400 }
			)
		}

		// In UI-only mode, we don't actually send WhatsApp messages
		// Just return success so the UI works
		return NextResponse.json({
			success: true,
			status: 'ok',
			message: 'Message sent successfully (UI-only mode - not actually sent via WhatsApp)',
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
