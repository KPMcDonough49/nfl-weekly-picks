import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    console.log('🗑️ Starting database reset (keeping game data)...')
    
    // Delete user-generated data in the correct order to respect foreign key constraints
    // 1. Delete picks first (references users and games)
    const deletedPicks = await prisma.pick.deleteMany({})
    console.log(`✅ Deleted ${deletedPicks.count} picks`)
    
    // 2. Delete weekly scores (references users and groups)
    const deletedWeeklyScores = await prisma.weeklyScore.deleteMany({})
    console.log(`✅ Deleted ${deletedWeeklyScores.count} weekly scores`)
    
    // 3. Delete group members (references users and groups)
    const deletedGroupMembers = await prisma.groupMember.deleteMany({})
    console.log(`✅ Deleted ${deletedGroupMembers.count} group members`)
    
    // 4. Delete groups
    const deletedGroups = await prisma.group.deleteMany({})
    console.log(`✅ Deleted ${deletedGroups.count} groups`)
    
    // 5. Delete users
    const deletedUsers = await prisma.user.deleteMany({})
    console.log(`✅ Deleted ${deletedUsers.count} users`)
    
    // Note: Games are preserved for future use
    
    console.log('🎉 Database reset completed successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Database reset completed successfully',
      data: {
        deletedPicks: deletedPicks.count,
        deletedWeeklyScores: deletedWeeklyScores.count,
        deletedGroupMembers: deletedGroupMembers.count,
        deletedGroups: deletedGroups.count,
        deletedUsers: deletedUsers.count,
        gamesPreserved: true
      }
    })
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
