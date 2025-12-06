import { NextResponse } from 'next/server'

const DEFAULT_NOTIFICATION_LIMIT = 100

export async function GET(request: Request) {
	try {
		// Return empty notifications in UI-only mode
		// Real-time updates are disabled without the Python backend
		return NextResponse.json({
			success: true,
			data: [], // No notifications in UI-only mode
		})
	} catch (error) {
		return NextResponse.json(
			{ success: false, message: (error as Error).message },
			{ status: 500 }
		)
	}
}
