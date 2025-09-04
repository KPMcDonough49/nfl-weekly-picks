const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log('Testing database connection...')
    
    // Check if demo group exists
    const group = await prisma.group.findUnique({
      where: { id: 'demo-group-1' }
    })
    console.log('Demo group:', group ? 'Found' : 'Not found')
    
    // Check how many games exist
    const gameCount = await prisma.game.count()
    console.log('Total games in database:', gameCount)
    
    // Check all games (games are now global)
    const allGames = await prisma.game.findMany()
    console.log('Total games:', allGames.length)
    
    if (allGames.length > 0) {
      console.log('First game:', {
        id: allGames[0].id,
        homeTeam: allGames[0].homeTeam,
        awayTeam: allGames[0].awayTeam,
        spread: allGames[0].spread
      })
    }
    
    // Check if specific game ID exists
    const specificGame = await prisma.game.findUnique({
      where: { id: 'f1bc532dff946d15cb85654b5c4b246e' }
    })
    console.log('Game f1bc532dff946d15cb85654b5c4b246e:', specificGame ? 'Found' : 'Not found')
    
  } catch (error) {
    console.error('Database test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
