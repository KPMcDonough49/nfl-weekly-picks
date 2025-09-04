import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    const season = searchParams.get('season')
    const groupId = searchParams.get('groupId')

    if (!week || !season) {
      return NextResponse.json(
        { success: false, error: 'Week and season are required' },
        { status: 400 }
      )
    }

    const targetWeek = parseInt(week)
    const targetSeason = parseInt(season)

    // Build where clause
    const whereClause: any = {
      week: targetWeek,
      season: targetSeason
    }

    if (groupId) {
      whereClause.groupId = groupId
    }

    // Get weekly scores with user information
    const weeklyScores = await prisma.weeklyScore.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { wins: 'desc' },
        { losses: 'asc' },
        { ties: 'desc' }
      ]
    })

    // Calculate win percentage and total picks
    const scoresWithStats = weeklyScores.map(score => ({
      ...score,
      totalPicks: score.wins + score.losses + score.ties,
      winPercentage: score.wins + score.losses + score.ties > 0 
        ? Math.round((score.wins / (score.wins + score.losses + score.ties)) * 100)
        : 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        week: targetWeek,
        season: targetSeason,
        scores: scoresWithStats
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
