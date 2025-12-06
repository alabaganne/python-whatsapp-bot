import { type NextRequest, NextResponse } from 'next/server'
import { getMockVacationPeriods } from '@/lib/mock-data'

export async function GET(_request: NextRequest) {
	try {
		const periods = getMockVacationPeriods()

		// Format for frontend (similar to backend format)
		const formatted = periods.map((period) => {
			const start = new Date(period.start_date)
			const end = new Date(period.end_date)

			return {
				start: start.toISOString(),
				end: end.toISOString(),
				title: period.title || `Vacation Period`,
				duration: period.duration_days,
			}
		})

		return NextResponse.json({ success: true, data: formatted })
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : 'Unknown error',
				data: [],
			},
			{ status: 500 }
		)
	}
}
