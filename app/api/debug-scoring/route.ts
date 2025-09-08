import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get a specific pick to debug
    const pick = await prisma.pick.findFirst({
      where: {
        pick: 'Washington Commanders'
      },
      include: {
        user: true,
        group: true
      }
    })

    if (!pick) {
      return NextResponse.json({ error: 'No pick found' })
    }

    // Get the game
    const game = await prisma.game.findFirst({
      where: {
        id: pick.gameId
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'No game found' })
    }

    // Test the grading logic
    const homeScore = game.homeScore || 0
    const awayScore = game.awayScore || 0
    const spread = game.spread || 0
    const actualSpread = homeScore - awayScore

    let result = 'pending'
    if (pick.pick === game.homeTeam) {
      // User picked home team
      if (spread < 0) {
        // Home team is favored (negative spread means home team favored)
        if (actualSpread > Math.abs(spread)) {
          result = 'correct' // Home team won by more than spread
        } else if (actualSpread === Math.abs(spread)) {
          result = 'tie' // Home team won by exactly the spread
        } else {
          result = 'incorrect' // Home team won by less than spread (or lost)
        }
      } else if (spread > 0) {
        // Home team is underdog (positive spread means away team favored)
        if (actualSpread > 0) {
          result = 'correct' // Home team won (underdog won)
        } else if (actualSpread === 0) {
          result = 'tie' // Tied game
        } else {
          // Home team lost, check if they covered
          if (Math.abs(actualSpread) < spread) {
            result = 'correct' // Home team lost by less than spread (covered)
          } else if (Math.abs(actualSpread) === spread) {
            result = 'tie' // Home team lost by exactly the spread
          } else {
            result = 'incorrect' // Home team lost by more than spread
          }
        }
      } else {
        // Even spread (pick'em)
        if (actualSpread > 0) {
          result = 'correct' // Home team won
        } else if (actualSpread < 0) {
          result = 'incorrect' // Home team lost
        } else {
          result = 'tie' // Tied game
        }
      }
    }

    return NextResponse.json({
      pick: {
        id: pick.id,
        pick: pick.pick,
        userId: pick.userId,
        gameId: pick.gameId
      },
      game: {
        id: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        spread: game.spread,
        status: game.status
      },
      calculation: {
        actualSpread,
        result,
        homeScore,
        awayScore,
        spread
      }
    })

  } catch (error) {
    console.error('Debug scoring error:', error)
    return NextResponse.json(
      { error: 'Failed to debug scoring' },
      { status: 500 }
    )
  }
}
