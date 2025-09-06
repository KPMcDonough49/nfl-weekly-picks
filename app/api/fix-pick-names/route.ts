import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get all picks that have 'home' or 'away' as their pick value
    const picksToFix = await prisma.pick.findMany({
      where: {
        pick: {
          in: ['home', 'away']
        }
      },
      include: {
        game: true
      }
    })

    console.log(`Found ${picksToFix.length} picks to fix`)

    let fixedCount = 0

    for (const pick of picksToFix) {
      if (!pick.game) {
        console.log(`Pick ${pick.id} has no associated game, skipping`)
        continue
      }

      // Convert 'home'/'away' to actual team names
      const teamName = pick.pick === 'home' ? pick.game.homeTeam : pick.game.awayTeam

      // Update the pick with the correct team name
      await prisma.pick.update({
        where: { id: pick.id },
        data: {
          pick: teamName
        }
      })

      fixedCount++
      console.log(`Fixed pick ${pick.id}: ${pick.pick} -> ${teamName}`)
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} picks`,
      fixedCount
    })
  } catch (error) {
    console.error('Error fixing pick names:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fix pick names' },
      { status: 500 }
    )
  }
}
