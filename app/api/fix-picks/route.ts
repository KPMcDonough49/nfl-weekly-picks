import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('🔄 Fixing picks in production database...')
    
    // Get all picks that have "home" or "away" as their pick value
    const picks = await prisma.pick.findMany({
      where: {
        pick: {
          in: ['home', 'away']
        }
      }
    })

    console.log(`Found ${picks.length} picks to fix`)

    let updated = 0
    for (const pick of picks) {
      // Get the game for this pick
      const game = await prisma.game.findUnique({
        where: { id: pick.gameId },
        select: {
          id: true,
          homeTeam: true,
          awayTeam: true
        }
      })

      if (!game) {
        console.log(`Skipping pick ${pick.id} - no game found`)
        continue
      }

      // Convert "home"/"away" to actual team names
      const teamName = pick.pick === 'home' ? game.homeTeam : game.awayTeam
      
      await prisma.pick.update({
        where: { id: pick.id },
        data: { pick: teamName }
      })
      
      console.log(`Updated pick ${pick.id}: ${pick.pick} → ${teamName}`)
      updated++
    }

    console.log(`✅ Successfully updated ${updated} picks`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${updated} picks`,
      updated
    })
    
  } catch (error) {
    console.error('❌ Error fixing picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fix picks' },
      { status: 500 }
    )
  }
}
