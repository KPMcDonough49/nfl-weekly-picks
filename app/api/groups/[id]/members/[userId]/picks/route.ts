import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET picks for a specific user in a group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const groupId = params.id
    const userId = params.userId
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || '1'
    const season = searchParams.get('season') || '2025'

    // Individual games are locked when they start - no global lock
    const now = new Date()
    const picksLocked = false // No global lock anymore

    // Get user's picks
    const picks = await prisma.pick.findMany({
      where: {
        userId,
        groupId
      }
    })

    // Get games for context (games are now global, no groupId needed)
    const games = await prisma.game.findMany({
      where: {
        week: parseInt(week),
        season: parseInt(season)
      }
    })

    // Combine picks with game data
    const picksWithGames = picks.map(pick => {
      const game = games.find(g => g.id === pick.gameId)
      return {
        id: pick.id,
        gameId: pick.gameId,
        pick: pick.pick,
        confidence: pick.confidence,
        createdAt: pick.createdAt,
        game: game ? {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          spread: game.spread,
          overUnder: game.overUnder,
          gameTime: game.gameTime,
          status: game.status
        } : null
      }
    })

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        picks: picksWithGames,
        picksLocked,
        week: parseInt(week),
        season: parseInt(season),
        totalPicks: picks.length
      }
    })
  } catch (error) {
    console.error('Error fetching user picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user picks' },
      { status: 500 }
    )
  }
}
