import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('🔄 Populating production database with correct data...')
    
    // Check current data
    const existingGames = await prisma.game.findMany({
      where: { week: 1, season: 2025 },
      select: { id: true, homeTeam: true, awayTeam: true }
    })
    
    console.log(`Found ${existingGames.length} games in production database`)
    
    // Check if Eagles game exists
    const eaglesGame = existingGames.find(g => 
      g.homeTeam.includes('Eagles') || g.awayTeam.includes('Eagles')
    )
    
    if (eaglesGame) {
      console.log('Eagles game found:', eaglesGame)
    } else {
      console.log('Eagles game NOT found - this is the problem!')
    }
    
    // Check picks
    const picks = await prisma.pick.findMany({
      where: {
        game: {
          week: 1,
          season: 2025
        }
      },
      select: { pick: true, confidence: true },
      take: 5
    })
    
    console.log('Sample picks:', picks)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Production database check completed',
      data: {
        gamesCount: existingGames.length,
        hasEaglesGame: !!eaglesGame,
        samplePicks: picks
      }
    })
    
  } catch (error) {
    console.error('Error checking production database:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check production database' },
      { status: 500 }
    )
  }
}
