import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
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

    // Get all completed games for this week
    const completedGames = await prisma.game.findMany({
      where: {
        week: targetWeek,
        season: targetSeason,
        status: 'final',
        homeScore: { not: null },
        awayScore: { not: null }
      }
    })

    if (completedGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed games found for this week',
        data: { gamesProcessed: 0 }
      })
    }

    // Get all picks for this week
    const whereClause: any = {
      gameId: { in: completedGames.map(g => g.id) }
    }
    
    if (groupId) {
      whereClause.groupId = groupId
    }

    const picks = await prisma.pick.findMany({
      where: whereClause,
      include: {
        user: true,
        group: true
      }
    })

    let totalPicksProcessed = 0
    let totalScoresUpdated = 0

    // Process each pick
    for (const pick of picks) {
      const game = completedGames.find(g => g.id === pick.gameId)
      if (!game || !game.homeScore || !game.awayScore) continue

      const result = gradePick(pick, game)
      
      if (result !== 'pending') {
        // Update weekly score
        await prisma.weeklyScore.upsert({
          where: {
            userId_groupId_week_season: {
              userId: pick.userId,
              groupId: pick.groupId,
              week: targetWeek,
              season: targetSeason
            }
          },
          update: {
            wins: result === 'correct' ? { increment: 1 } : undefined,
            losses: result === 'incorrect' ? { increment: 1 } : undefined,
            ties: result === 'tie' ? { increment: 1 } : undefined
          },
          create: {
            userId: pick.userId,
            groupId: pick.groupId,
            week: targetWeek,
            season: targetSeason,
            wins: result === 'correct' ? 1 : 0,
            losses: result === 'incorrect' ? 1 : 0,
            ties: result === 'tie' ? 1 : 0
          }
        })
        totalScoresUpdated++
      }
      
      totalPicksProcessed++
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${totalPicksProcessed} picks and updated ${totalScoresUpdated} scores`,
      data: {
        gamesProcessed: completedGames.length,
        picksProcessed: totalPicksProcessed,
        scoresUpdated: totalScoresUpdated
      }
    })

  } catch (error) {
    console.error('Error scoring picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to score picks' },
      { status: 500 }
    )
  }
}

function gradePick(pick: any, game: any): 'correct' | 'incorrect' | 'tie' | 'pending' {
  const { pick: pickType, gameId } = pick
  const { homeScore, awayScore, overUnder, homeTeam, awayTeam } = game

  if (!homeScore || !awayScore) {
    return 'pending'
  }

  const spread = game.spread || 0
  const actualSpread = homeScore - awayScore // Positive = home won, Negative = away won
  
  // Calculate total points for over/under
  const totalPoints = homeScore + awayScore
  
  // Grade the pick based on what was actually picked
  if (pickType === homeTeam) {
    // User picked home team
    if (spread < 0) {
      // Home team is favored (negative spread means home team favored)
      if (actualSpread > Math.abs(spread)) {
        return 'correct' // Home team won by more than spread
      } else if (actualSpread === Math.abs(spread)) {
        return 'tie' // Home team won by exactly the spread
      } else {
        return 'incorrect' // Home team won by less than spread (or lost)
      }
    } else if (spread > 0) {
      // Home team is underdog (positive spread means away team favored)
      if (actualSpread > 0) {
        return 'correct' // Home team won (underdog won)
      } else if (actualSpread === 0) {
        return 'tie' // Tied game
      } else {
        // Home team lost, check if they covered
        if (Math.abs(actualSpread) < spread) {
          return 'correct' // Home team lost by less than spread (covered)
        } else if (Math.abs(actualSpread) === spread) {
          return 'tie' // Home team lost by exactly the spread
        } else {
          return 'incorrect' // Home team lost by more than spread
        }
      }
    } else {
      // Even spread (pick'em)
      if (actualSpread > 0) {
        return 'correct' // Home team won
      } else if (actualSpread < 0) {
        return 'incorrect' // Home team lost
      } else {
        return 'tie' // Tied game
      }
    }
  } else if (pickType === awayTeam) {
    // User picked away team
    if (spread > 0) {
      // Away team is favored (positive spread means away team favored)
      if (actualSpread < -spread) {
        return 'correct' // Away team won by more than spread
      } else if (actualSpread === -spread) {
        return 'tie' // Away team won by exactly the spread
      } else {
        return 'incorrect' // Away team won by less than spread (or lost)
      }
    } else if (spread < 0) {
      // Away team is underdog (negative spread means home team favored)
      if (actualSpread < 0) {
        return 'correct' // Away team won (underdog won)
      } else if (actualSpread === 0) {
        return 'tie' // Tied game
      } else {
        // Away team lost, check if they covered
        if (actualSpread < Math.abs(spread)) {
          return 'correct' // Away team lost by less than spread (covered)
        } else if (actualSpread === Math.abs(spread)) {
          return 'tie' // Away team lost by exactly the spread
        } else {
          return 'incorrect' // Away team lost by more than spread
        }
      }
    } else {
      // Even spread (pick'em)
      if (actualSpread < 0) {
        return 'correct' // Away team won
      } else if (actualSpread > 0) {
        return 'incorrect' // Away team lost
      } else {
        return 'tie' // Tied game
      }
    }
  } else if (pickType === 'over') {
    if (totalPoints > overUnder) {
      return 'correct'
    } else if (totalPoints < overUnder) {
      return 'incorrect'
    } else {
      return 'tie'
    }
  } else if (pickType === 'under') {
    if (totalPoints < overUnder) {
      return 'correct'
    } else if (totalPoints > overUnder) {
      return 'incorrect'
    } else {
      return 'tie'
    }
  }

  return 'pending'
}
