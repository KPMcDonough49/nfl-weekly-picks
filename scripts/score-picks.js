#!/usr/bin/env node

/**
 * Script to automatically score picks based on completed games
 * This can be run manually or scheduled as a cron job
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function scorePicks() {
  try {
    const now = new Date()
    const currentWeek = 1 // You might want to calculate this dynamically
    const currentSeason = 2025
    
    // Determine scoring phase based on current time
    const phase = getScoringPhase(now)
    
    console.log(`🏈 Starting pick scoring process...`)
    console.log(`📅 Phase: ${phase.name}`)
    console.log(`⏰ Time: ${now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT`)
    console.log(`📊 Week ${currentWeek}, Season ${currentSeason}`)
    
    // Get all completed games for this week
    const completedGames = await prisma.game.findMany({
      where: {
        week: currentWeek,
        season: currentSeason,
        status: 'final',
        homeScore: { not: null },
        awayScore: { not: null }
      }
    })
    
    console.log(`Found ${completedGames.length} completed games`)
    
    if (completedGames.length === 0) {
      console.log('No completed games found for this week')
      return
    }
    
    // Get all picks for this week
    const picks = await prisma.pick.findMany({
      where: {
        gameId: { in: completedGames.map(g => g.id) }
      },
      include: {
        user: true,
        group: true
      }
    })
    
    console.log(`Found ${picks.length} picks to score`)
    
    let totalPicksProcessed = 0
    let totalScoresUpdated = 0
    
    // Process each pick
    for (const pick of picks) {
      const game = completedGames.find(g => g.id === pick.gameId)
      if (!game || !game.homeScore || !game.awayScore) continue
      
      const result = gradePick(pick, game)
      
      if (result !== 'pending') {
        // Update weekly score
        await prisma.weeklyScore.upsert({
          where: {
            userId_groupId_week_season: {
              userId: pick.userId,
              groupId: pick.groupId,
              week: currentWeek,
              season: currentSeason
            }
          },
          update: {
            wins: result === 'correct' ? { increment: 1 } : undefined,
            losses: result === 'incorrect' ? { increment: 1 } : undefined,
            ties: result === 'tie' ? { increment: 1 } : undefined
          },
          create: {
            userId: pick.userId,
            groupId: pick.groupId,
            week: currentWeek,
            season: currentSeason,
            wins: result === 'correct' ? 1 : 0,
            losses: result === 'incorrect' ? 1 : 0,
            ties: result === 'tie' ? 1 : 0
          }
        })
        totalScoresUpdated++
      }
      
      totalPicksProcessed++
    }
    
    console.log(`✅ Scoring complete!`)
    console.log(`   Games processed: ${completedGames.length}`)
    console.log(`   Picks processed: ${totalPicksProcessed}`)
    console.log(`   Scores updated: ${totalScoresUpdated}`)
    
    // Log the scoring event
    console.log(`📝 ${phase.name} scoring completed at ${now.toISOString()}`)
    
  } catch (error) {
    console.error('❌ Error scoring picks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function getScoringPhase(now) {
  const ptTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}))
  const dayOfWeek = ptTime.getDay() // 0 = Sunday, 1 = Monday, etc.
  const hour = ptTime.getHours()
  const minute = ptTime.getMinutes()
  
  // Thursday 12:00 AM PT
  if (dayOfWeek === 4 && hour === 0 && minute === 0) {
    return { name: 'Thursday Midnight', description: 'Score any early games' }
  }
  
  // Sunday 2:00 PM PT
  if (dayOfWeek === 0 && hour === 14 && minute === 0) {
    return { name: 'Sunday 2PM', description: 'Score games before Sunday kickoffs' }
  }
  
  // Sunday 12:00 AM PT (Monday 12:00 AM UTC)
  if (dayOfWeek === 1 && hour === 0 && minute === 0) {
    return { name: 'Sunday Midnight', description: 'Score Sunday games' }
  }
  
  // Monday 12:00 AM PT (Tuesday 12:00 AM UTC)
  if (dayOfWeek === 2 && hour === 0 && minute === 0) {
    return { name: 'Monday Midnight', description: 'Score Monday games & finalize week' }
  }
  
  // Manual run
  return { name: 'Manual Run', description: 'Manual scoring execution' }
}

function gradePick(pick, game) {
  const { pick: pickType } = pick
  const { homeScore, awayScore, spread, overUnder } = game
  
  const homeTeamWon = homeScore > awayScore
  const awayTeamWon = awayScore > homeScore
  const tied = homeScore === awayScore
  
  // Calculate total points
  const totalPoints = homeScore + awayScore
  const overUnderResult = totalPoints > overUnder ? 'over' : 'under'
  
  // Grade the pick
  if (pickType === 'home') {
    if (tied) return 'tie'
    return homeTeamWon ? 'correct' : 'incorrect'
  } else if (pickType === 'away') {
    if (tied) return 'tie'
    return awayTeamWon ? 'correct' : 'incorrect'
  } else if (pickType === 'over') {
    if (totalPoints === overUnder) return 'tie'
    return overUnderResult === 'over' ? 'correct' : 'incorrect'
  } else if (pickType === 'under') {
    if (totalPoints === overUnder) return 'tie'
    return overUnderResult === 'under' ? 'correct' : 'incorrect'
  }
  
  return 'pending'
}

// Run the script
if (require.main === module) {
  scorePicks()
}

module.exports = { scorePicks }
