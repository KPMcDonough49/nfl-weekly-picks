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
        createdAt: true
      }
    })

    // Get games for this week to include game information
    const games = await prisma.game.findMany({
      where: {
        week: parseInt(week),
        season: parseInt(season)
      },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        spread: true,
        overUnder: true,
        gameTime: true,
        status: true,
        homeScore: true,
        awayScore: true
      }
    })

    // Combine picks with game data and convert pick values to team names
    const picksWithGames = picks.map(pick => {
      const game = games.find(g => g.id === pick.gameId)
      if (!game) return pick

      // Convert pick value to actual team name
      let teamPick = pick.pick
      if (pick.pick === 'home') {
        teamPick = game.homeTeam
      } else if (pick.pick === 'away') {
        teamPick = game.awayTeam
      }

      return {
        ...pick,
        pick: teamPick,
        game: {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          spread: game.spread,
          overUnder: game.overUnder,
          gameTime: game.gameTime,
          status: game.status,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        picks: picksWithGames
      }
    })
  } catch (error) {
    console.error('Error fetching group picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group picks' },
      { status: 500 }
    )
  }
}
