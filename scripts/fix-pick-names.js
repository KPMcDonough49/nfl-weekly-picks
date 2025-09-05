const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixPickNames() {
  console.log('🔄 Fixing pick names from "home"/"away" to team names...')
  
  try {
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
  } catch (error) {
    console.error('❌ Error fixing pick names:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPickNames()