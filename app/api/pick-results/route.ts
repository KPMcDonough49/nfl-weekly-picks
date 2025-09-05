import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    const season = searchParams.get('season')
    const groupId = searchParams.get('groupId')
    const userId = searchParams.get('userId')

    if (!week || !season) {
      return NextResponse.json(
        { success: false, error: 'Week and season are required' },
        { status: 400 }
      )
    }

    const targetWeek = parseInt(week)
    const targetSeason = parseInt(season)

    // Build where clause for picks
    const picksWhereClause: any = {
      gameId: { in: [] } // Will be populated with game IDs
    }

    if (groupId) {
      picksWhereClause.groupId = groupId
    }

    if (userId) {
      picksWhereClause.userId = userId
    }

    // Get all games for this week
    const games = await prisma.game.findMany({
      where: {
        week: targetWeek,
        season: targetSeason
      },
      orderBy: { gameTime: 'asc' }
    })

    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        data: { picks: [], games: [] }
      })
    }

    // Update picks where clause with game IDs
    picksWhereClause.gameId = { in: games.map(g => g.id) }

    // Get picks for these games
    const picks = await prisma.pick.findMany({
      where: picksWhereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Grade each pick and create results
    const pickResults = picks.map(pick => {
      const game = games.find(g => g.id === pick.gameId)
      if (!game) return null

      const result = gradePick(pick, game)
      const gameResult = getGameResult(game)

      return {
        ...pick,
        game: {
          id: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          spread: game.spread,
          overUnder: game.overUnder,
          gameTime: game.gameTime,
          status: game.status
        },
        result: result,
        gameResult: gameResult
      }
    }).filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        week: targetWeek,
        season: targetSeason,
        picks: pickResults,
        games: games
      }
    })

  } catch (error) {
    console.error('Error fetching pick results:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pick results' },
      { status: 500 }
    )
  }
}

function gradePick(pick: any, game: any): 'correct' | 'incorrect' | 'tie' | 'pending' {
  const { pick: pickType } = pick
  const { homeScore, awayScore, spread, overUnder, status } = game

  if (status !== 'final' || !homeScore || !awayScore) {
    return 'pending'
  }

  const homeTeamWon = homeScore > awayScore
  const awayTeamWon = awayScore > homeScore
  const tied = homeScore === awayScore

  // Calculate total points
  const totalPoints = homeScore + awayScore
  const overUnderResult = totalPoints > overUnder ? 'over' : 'under'

  // Grade the pick
  if (pickType === 'home') {
    if (tied) return 'tie'
    return homeTeamWon ? 'correct' : 'incorrect'
  } else if (pickType === 'away') {
    if (tied) return 'tie'
    return awayTeamWon ? 'correct' : 'incorrect'
  } else if (pickType === 'over') {
    if (totalPoints === overUnder) return 'tie'
    return overUnderResult === 'over' ? 'correct' : 'incorrect'
  } else if (pickType === 'under') {
    if (totalPoints === overUnder) return 'tie'
    return overUnderResult === 'under' ? 'correct' : 'incorrect'
  }

  return 'pending'
}

function getGameResult(game: any) {
  const { homeScore, awayScore, status } = game

  if (status !== 'final' || !homeScore || !awayScore) {
    return { status: 'pending', winner: null, score: null }
  }

  const homeTeamWon = homeScore > awayScore
  const awayTeamWon = awayScore > homeScore
  const tied = homeScore === awayScore

  return {
    status: 'final',
    winner: homeTeamWon ? 'home' : awayTeamWon ? 'away' : 'tie',
    score: `${game.awayTeam} ${awayScore} @ ${game.homeTeam} ${homeScore}`,
    homeScore,
    awayScore
  }
}
