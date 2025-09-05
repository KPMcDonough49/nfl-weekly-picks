import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Import the ESPN update function
    const { updateGameScoresFromESPN } = await import('@/lib/nfl-api')
    
    console.log('🔄 Starting ESPN score update from API...')
    await updateGameScoresFromESPN()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Scores updated successfully from ESPN API' 
    })
  } catch (error) {
    console.error('Error updating scores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update scores' },
      { status: 500 }
    )
  }
}
