import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateGameScoresFromESPN } from '@/lib/nfl-api'

export const dynamic = 'force-dynamic'

// This endpoint will be called by Vercel Cron Jobs
export async function GET() {
  try {
    console.log('🔄 Starting automated cron job...')
    
    // Step 1: Update game scores from ESPN
    console.log('📊 Updating game scores from ESPN...')
    await updateGameScoresFromESPN()
    
    // Step 2: Score the picks
    console.log('🏈 Scoring picks...')
    const { scorePicks } = await import('@/scripts/score-picks')
    await scorePicks()
    
    console.log('✅ Cron job completed successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cron job completed successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Cron job failed:', error)
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    )
  }
}
