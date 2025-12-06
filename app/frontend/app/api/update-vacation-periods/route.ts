import { type NextRequest, NextResponse } from 'next/server'
import {
	getMockVacationPeriods,
	saveMockVacationPeriods,
	getNextId,
	type MockVacationPeriod,
} from '@/lib/mock-data'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { periods } = body

		if (!periods || !Array.isArray(periods)) {
			return NextResponse.json(
				{ success: false, message: 'Invalid vacation periods data' },
				{ status: 400 }
			)
		}

		const currentPeriods = getMockVacationPeriods()

		// Convert frontend format to mock format
		const newPeriods: MockVacationPeriod[] = periods.map((period, index) => {
			const start = typeof period.start === 'string' ? period.start.split('T')[0] : period.start_date
			const end = typeof period.end === 'string' ? period.end.split('T')[0] : period.end_date

			const startDate = new Date(start)
			const endDate = new Date(end)
			const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

			return {
				id: index + 1,
				start_date: start,
				end_date: end,
				title: period.title || 'Vacation Period',
				duration_days: duration,
			}
		})

		saveMockVacationPeriods(newPeriods)

		return NextResponse.json({
			success: true,
			message: 'Vacation periods updated successfully',
		})
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to update vacation periods: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 }
		)
	}
}
