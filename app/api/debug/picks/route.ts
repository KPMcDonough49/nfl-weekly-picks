import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    
    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'groupId is required' },
        { status: 400 }
      )
    }

    // Get all picks for this group
    const picks = await prisma.pick.findMany({
      where: {
        groupId
      },
      select: {
        id: true,
        userId: true,
        gameId: true,
        pick: true,
        confidence: true,
        result: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get user info for each pick
    const picksWithUsers = await Promise.all(
      picks.map(async (pick) => {
        const user = await prisma.user.findUnique({
          where: { id: pick.userId },
          select: { id: true, name: true }
        })
        
        const game = await prisma.game.findUnique({
          where: { id: pick.gameId },
          select: { homeTeam: true, awayTeam: true, gameTime: true, status: true }
        })
        
        return {
          ...pick,
          user: user,
          game: game
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        picks: picksWithUsers,
        totalPicks: picks.length
      }
    })
  } catch (error) {
    console.error('Error fetching debug picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch picks' },
      { status: 500 }
    )
  }
}
