import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Fix the Eagles vs Cowboys game time (should be in the past)
    const eaglesGame = await prisma.game.findFirst({
      where: {
        OR: [
          { homeTeam: 'Philadelphia Eagles', awayTeam: 'Dallas Cowboys' },
          { homeTeam: 'Dallas Cowboys', awayTeam: 'Philadelphia Eagles' }
        ]
      }
    })

    if (eaglesGame) {
      await prisma.game.update({
        where: { id: eaglesGame.id },
        data: {
          gameTime: new Date('2025-09-05T18:00:00.000Z') // 6 PM UTC on Sept 5
        }
      })
      console.log(`Fixed Eagles game time: ${eaglesGame.id}`)
    }

    // Fix the Chiefs vs Chargers game time (should be in the past)
    const chiefsGame = await prisma.game.findFirst({
      where: {
        OR: [
          { homeTeam: 'Kansas City Chiefs', awayTeam: 'Los Angeles Chargers' },
          { homeTeam: 'Los Angeles Chargers', awayTeam: 'Kansas City Chiefs' }
        ]
      }
    })

    if (chiefsGame) {
      await prisma.game.update({
        where: { id: chiefsGame.id },
        data: {
          gameTime: new Date('2025-09-05T22:00:00.000Z') // 10 PM UTC on Sept 5
        }
      })
      console.log(`Fixed Chiefs game time: ${chiefsGame.id}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Fixed game times for completed games'
    })
  } catch (error) {
    console.error('Error fixing game times:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fix game times' },
      { status: 500 }
    )
  }
}
