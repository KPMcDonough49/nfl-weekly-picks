import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET past weeks data for a group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const { searchParams } = new URL(request.url)
    // Derive current week/season if not provided
    let currentWeek = parseInt(searchParams.get('currentWeek') || '0')
    let currentSeason = parseInt(searchParams.get('currentSeason') || '0')

    if (!currentWeek || !currentSeason) {
      const now = new Date()
      const year = now.getFullYear()
      const seasonStart = new Date(year, 8, 4) // Approx first Thu of Sept
      if (now >= seasonStart) {
        const weekStart = new Date(seasonStart)
        let weekNumber = 1
        while (weekStart <= now && weekNumber <= 18) {
          weekStart.setDate(weekStart.getDate() + 7)
          weekNumber++
        }
        currentWeek = Math.min(18, Math.max(1, weekNumber - 1))
        currentSeason = year
      } else {
        currentWeek = 18
        currentSeason = year - 1
      }
    }

    // Get all weekly scores for this group, excluding current week
    const weeklyScores = await prisma.weeklyScore.findMany({
      where: {
        groupId: groupId,
        week: { lt: currentWeek }, // Only past weeks
        season: currentSeason
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { week: 'desc' }, // Most recent weeks first
        { wins: 'desc' }  // Within each week, order by wins
      ]
    })

    // Get all group members to ensure we show everyone
    const groupMembers = await prisma.user.findMany({
      where: {
        groupMemberships: {
          some: {
            groupId: groupId
          }
        }
      },
      select: {
        id: true,
        name: true
      }
    })

    // Group scores by week
    const weeksMap = new Map<number, any>()
    
    weeklyScores.forEach(score => {
      if (!weeksMap.has(score.week)) {
        weeksMap.set(score.week, {
          week: score.week,
          members: [],
          overallWinner: null
        })
      }
      
      weeksMap.get(score.week)!.members.push({
        id: score.user.id,
        name: score.user.name,
        wins: score.wins,
        losses: score.losses,
        ties: score.ties
      })
    })

    // For each week, ensure all members are represented and find overall winner
    const weeks = Array.from(weeksMap.values()).map(weekData => {
      // Add members who don't have scores (0-0-0 record)
      const memberIds = weekData.members.map((m: any) => m.id)
      groupMembers.forEach(member => {
        if (!memberIds.includes(member.id)) {
          weekData.members.push({
            id: member.id,
            name: member.name,
            wins: 0,
            losses: 0,
            ties: 0
          })
        }
      })

      // Sort members by wins (descending), then by losses (ascending), then by ties (descending)
      weekData.members.sort((a: any, b: any) => {
        if (a.wins !== b.wins) return b.wins - a.wins
        if (a.losses !== b.losses) return a.losses - b.losses
        return b.ties - a.ties
      })

      // Set overall winner (person with most wins)
      if (weekData.members.length > 0) {
        const topMember = weekData.members[0]
        // Only set as winner if they have at least one win
        if (topMember.wins > 0) {
          weekData.overallWinner = topMember
        }
      }

      return weekData
    })

    return NextResponse.json({
      success: true,
      data: {
        weeks: weeks,
        totalWeeks: weeks.length
      }
    })
  } catch (error) {
    console.error('Error fetching past weeks data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch past weeks data' },
      { status: 500 }
    )
  }
}
