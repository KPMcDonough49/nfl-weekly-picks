import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET members for a group with pick status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || '1' // Default to week 1
    const season = searchParams.get('season') || '2025' // Default to season 2025

    // Get unique users in the group
    const members = await prisma.user.findMany({
      where: {
        groupMemberships: {
          some: {
            groupId: groupId
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Get pick status for each member
    const membersWithPicks = await Promise.all(
      members.map(async (member) => {
        const picks = await prisma.pick.findMany({
          where: {
            userId: member.id,
            groupId
          }
        })

        // Check if they have picks for the current week
        const hasPicks = picks.length > 0

        // Get weekly score if it exists
        const weeklyScore = await prisma.weeklyScore.findFirst({
          where: {
            userId: member.id,
            groupId,
            week: parseInt(week),
            season: parseInt(season)
          }
        })

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          hasPicks,
          pickCount: picks.length,
          wins: weeklyScore?.wins || 0,
          losses: weeklyScore?.losses || 0,
          ties: weeklyScore?.ties || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        members: membersWithPicks,
        week: parseInt(week),
        season: parseInt(season)
      }
    })
  } catch (error) {
    console.error('Error fetching group members:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group members' },
      { status: 500 }
    )
  }
}
