#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedDemoData() {
  try {
    console.log('🌱 Seeding demo data...')

    // Create demo user
    const demoUser = await prisma.user.upsert({
      where: { id: 'demo-user' },
      update: {},
      create: {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        password: 'demo-password',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log('✅ Created demo user:', demoUser.name)

    // Create second test user
    const testUser = await prisma.user.upsert({
      where: { id: 'test-user' },
      update: {},
      create: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        password: 'test-password',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log('✅ Created test user:', testUser.name)

    // Create demo group
    const demoGroup = await prisma.group.upsert({
      where: { id: 'demo-group-1' },
      update: {},
      create: {
        id: 'demo-group-1',
        name: 'Family Picks',
        description: 'Weekly picks with the family',
        createdBy: 'demo-user',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log('✅ Created demo group:', demoGroup.name)

    // Add demo user to group
    await prisma.groupMember.upsert({
      where: { 
        userId_groupId: { 
          userId: 'demo-user', 
          groupId: 'demo-group-1' 
        } 
      },
      update: {},
      create: {
        userId: 'demo-user',
        groupId: 'demo-group-1',
        joinedAt: new Date()
      }
    })
    console.log('✅ Added demo user to group')

    // Add test user to group
    await prisma.groupMember.upsert({
      where: { 
        userId_groupId: { 
          userId: 'test-user', 
          groupId: 'demo-group-1' 
        } 
      },
      update: {},
      create: {
        userId: 'test-user',
        groupId: 'demo-group-1',
        joinedAt: new Date()
      }
    })
    console.log('✅ Added test user to group')

    // Create demo games
    const demoGames = [
      {
        id: 'test-game-1',
        homeTeam: 'Ravens',
        awayTeam: 'Bills',
        spread: -1.5,
        overUnder: 48.5,
        gameTime: '2024-12-01T20:00:00Z',
        status: 'scheduled',
        // Removed groupId since games are global
        week: 12,
        season: 2024
      },
      {
        id: 'test-game-2',
        homeTeam: 'Chiefs',
        awayTeam: 'Raiders',
        spread: -3.5,
        overUnder: 44.0,
        gameTime: '2024-12-01T17:00:00Z',
        status: 'scheduled',
        // Removed groupId since games are global
        week: 12,
        season: 2024
      }
    ]

    for (const game of demoGames) {
      await prisma.game.upsert({
        where: { id: game.id },
        update: {},
        create: game
      })
    }
    console.log('✅ Created demo games')

    console.log('\n🎉 Demo data seeded successfully!')
    console.log('You can now:')
    console.log('- Visit http://localhost:3000/groups/demo-group-1')
    console.log('- See both users in the group')
    console.log('- Make picks and submit them')
    console.log('- See them saved in the database')

  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedDemoData()
