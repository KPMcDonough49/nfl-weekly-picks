const { PrismaClient } = require('@prisma/client')

// Use production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function populateProduction() {
  console.log('🔄 Populating production database...')
  
  try {
    // First, let's check what's in the production database
    const existingGames = await prisma.game.findMany({
      where: { week: 1, season: 2025 },
      select: { id: true, homeTeam: true, awayTeam: true, gameTime: true }
    })
    
    console.log(`Found ${existingGames.length} games in production database`)
    
    // Check if Eagles game exists
    const eaglesGame = existingGames.find(g => 
      g.homeTeam.includes('Eagles') || g.awayTeam.includes('Eagles')
    )
    
    if (eaglesGame) {
      console.log('Eagles game found:', eaglesGame)
    } else {
      console.log('Eagles game NOT found in production database')
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
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

populateProduction()
