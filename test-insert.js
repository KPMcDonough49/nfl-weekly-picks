const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testInsert() {
  try {
    console.log('Testing manual game insertion...')
    
    // Try to insert a game manually
    const newGame = await prisma.game.create({
      data: {
        id: 'test-manual-game',
        week: 12,
        season: 2024,
        homeTeam: 'Test Home Team',
        awayTeam: 'Test Away Team',
        spread: -3.5,
        overUnder: 45.0,
        gameTime: new Date(),
        status: 'scheduled',
        groupId: 'demo-group-1'
      }
    })
    
    console.log('Successfully inserted game:', newGame.id)
    
    // Check if it exists
    const foundGame = await prisma.game.findUnique({
      where: { id: 'test-manual-game' }
    })
    console.log('Found inserted game:', foundGame ? 'Yes' : 'No')
    
    // Clean up
    await prisma.game.delete({
      where: { id: 'test-manual-game' }
    })
    console.log('Cleaned up test game')
    
  } catch (error) {
    console.error('Insert test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testInsert()
