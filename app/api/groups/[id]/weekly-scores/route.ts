import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || '1'
    const season = searchParams.get('season') || '2025'

    // Get all weekly scores for this group
    const scores = await prisma.weeklyScore.findMany({
      where: {
        groupId,
        week: parseInt(week),
        season: parseInt(season)
      },
      select: {
        id: true,
        userId: true,
        groupId: true,
        week: true,
        season: true,
        wins: true,
        losses: true,
        ties: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        scores
      }
    })
  } catch (error) {
    console.error('Error fetching weekly scores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly scores' },
      { status: 500 }
    )
  }
}
