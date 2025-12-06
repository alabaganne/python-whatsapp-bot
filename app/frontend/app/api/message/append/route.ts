import { NextResponse } from 'next/server'
import { getMockConversations, saveMockConversations, getNextId } from '@/lib/mock-data'

export async function POST(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const wa_id = searchParams.get('wa_id')

		if (!wa_id) {
			return NextResponse.json(
				{ success: false, message: 'Missing required parameter: wa_id' },
				{ status: 400 }
			)
		}

		const body = await request.json()
		const { role, message, date, time } = body

		// Validate required fields
		if (!(role && message && date && time)) {
			return NextResponse.json(
				{
					success: false,
					message: 'Missing required fields: role, message, date, time',
				},
				{ status: 400 }
			)
		}

		const conversations = getMockConversations()

		// Get or create conversation for this customer
		if (!conversations[wa_id]) {
			conversations[wa_id] = []
		}

		// Add new message
		const allMessages = Object.values(conversations).flat()
		const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id)) + 1 : 1

		conversations[wa_id].push({
			id: newId,
			wa_id,
			role: role as any,
			message,
			date,
			time,
		})

		saveMockConversations(conversations)

		return NextResponse.json({ success: true })
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to append message: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
