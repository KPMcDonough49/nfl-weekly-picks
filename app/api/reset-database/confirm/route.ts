import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // This endpoint requires a confirmation parameter
    const { confirm } = await request.json()
    
    if (confirm !== 'RESET_ALL_DATA') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Confirmation required. Send { "confirm": "RESET_ALL_DATA" } to proceed.' 
        },
        { status: 400 }
      )
    }
    
    // Import prisma here to avoid issues
    const { prisma } = await import('@/lib/db')
    
    console.log('🗑️ Starting confirmed database reset (keeping game data)...')
    
    // Delete user-generated data in the correct order to respect foreign key constraints
    const deletedPicks = await prisma.pick.deleteMany({})
    const deletedWeeklyScores = await prisma.weeklyScore.deleteMany({})
    const deletedGroupMembers = await prisma.groupMember.deleteMany({})
    const deletedGroups = await prisma.group.deleteMany({})
    const deletedUsers = await prisma.user.deleteMany({})
    
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
