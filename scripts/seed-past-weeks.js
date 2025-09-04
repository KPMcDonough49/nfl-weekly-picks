#!/usr/bin/env node

/**
 * Script to seed past weeks data for testing the Past Weeks UI
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedPastWeeks() {
  try {
    console.log('🏈 Seeding past weeks data for testing...')
    
    // Get the first group (assuming you have at least one group)
    const group = await prisma.group.findFirst({
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })
    
    if (!group) {
      console.log('❌ No groups found. Please create a group first.')
      return
    }
    
    console.log(`📊 Found group: ${group.name} with ${group.members.length} members`)
    
    // Create sample weekly scores for the past 3 weeks
    const weeks = [1, 2, 3] // Past weeks
    const members = group.members.map(m => m.user)
    
    console.log(`👥 Members: ${members.map(m => m.name).join(', ')}`)
    
    for (const week of weeks) {
      console.log(`\n📅 Creating Week ${week} scores...`)
      
      // Create different win patterns for each week to make it interesting
      const weekPatterns = {
        1: [
          { wins: 8, losses: 3, ties: 1 }, // Winner
          { wins: 7, losses: 4, ties: 1 },
          { wins: 6, losses: 5, ties: 1 },
          { wins: 5, losses: 6, ties: 1 }
        ],
        2: [
          { wins: 6, losses: 5, ties: 1 },
          { wins: 9, losses: 2, ties: 1 }, // Winner
          { wins: 7, losses: 4, ties: 1 },
          { wins: 4, losses: 7, ties: 1 }
        ],
        3: [
          { wins: 7, losses: 4, ties: 1 },
          { wins: 6, losses: 5, ties: 1 },
          { wins: 8, losses: 3, ties: 1 }, // Winner
          { wins: 5, losses: 6, ties: 1 }
        ]
      }
      
      const patterns = weekPatterns[week] || weekPatterns[1]
      
      for (let i = 0; i < members.length; i++) {
        const member = members[i]
        const pattern = patterns[i] || { wins: 0, losses: 0, ties: 0 }
        
        // Check if score already exists
        const existingScore = await prisma.weeklyScore.findFirst({
          where: {
            userId: member.id,
            groupId: group.id,
            week: week,
            season: 2025
          }
        })
        
        if (existingScore) {
          console.log(`  ✅ ${member.name}: ${pattern.wins}-${pattern.losses}-${pattern.ties} (already exists)`)
          continue
        }
        
        // Create new weekly score
        await prisma.weeklyScore.create({
          data: {
            userId: member.id,
            groupId: group.id,
            week: week,
            season: 2025,
            wins: pattern.wins,
            losses: pattern.losses,
            ties: pattern.ties
          }
        })
        
        console.log(`  ✅ ${member.name}: ${pattern.wins}-${pattern.losses}-${pattern.ties}`)
      }
    }
    
    console.log('\n🎉 Past weeks data seeded successfully!')
    console.log('\n📱 You can now test the Past Weeks feature:')
    console.log(`   1. Go to your group: /groups/${group.id}`)
    console.log('   2. Click the "Past Weeks" button')
    console.log('   3. You should see 3 weeks of data with different winners!')
    
  } catch (error) {
    console.error('❌ Error seeding past weeks data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
seedPastWeeks()
