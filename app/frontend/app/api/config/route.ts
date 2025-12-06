import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Mock config data (can be extended as needed)
const DEFAULT_CONFIG = {
	business_name: 'Demo Clinic',
	business_address: '123 Main St, Riyadh',
	timezone: 'Asia/Riyadh',
	working_hours: {
		start: '09:00',
		end: '17:00',
	},
	time_slot_duration: 30,
	max_reservations_per_slot: 3,
}

export async function GET(_req: NextRequest) {
	try {
		// Return mock config
		return NextResponse.json({
			success: true,
			data: DEFAULT_CONFIG,
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to fetch config: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}

export async function PUT(req: NextRequest) {
	try {
		const body = await req.json()
		// In UI-only mode, we just acknowledge the update
		return NextResponse.json({
			success: true,
			message: 'Config updated successfully (UI-only mode)',
			data: { ...DEFAULT_CONFIG, ...body },
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to update config: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		// In UI-only mode, we just acknowledge the creation
		return NextResponse.json({
			success: true,
			message: 'Config created successfully (UI-only mode)',
			data: { ...DEFAULT_CONFIG, ...body },
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to create config: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
