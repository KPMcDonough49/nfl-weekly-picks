#!/usr/bin/env node

/**
 * Script to automatically score picks based on completed games
 * This can be run manually or scheduled as a cron job
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ESPN API integration will be handled separately

async function scorePicks() {
  try {
    const now = new Date()
    const year = now.getFullYear()
    
    // NFL Week 1 typically starts on the first Thursday of September
    // For 2025, let's assume Week 1 starts September 4th (Thursday)
    const seasonStart = new Date(year, 8, 4) // September 4th, 2025
    
    // Calculate days since season start
    const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (24 * 60 * 60 * 1000))
    
    let currentWeek, currentSeason
    if (daysSinceStart < 0) {
      // Before season starts
      currentSeason = year - 1
      currentWeek = 18
    } else if (daysSinceStart < 5) {
      // Week 1 (Thursday to Monday)
      currentSeason = year
      currentWeek = 1
    } else {
      // Calculate which week we're in
      const weekNumber = Math.floor((daysSinceStart - 5) / 7) + 2
      currentSeason = year
      currentWeek = Math.min(18, Math.max(1, weekNumber))
    }
    
    // Determine scoring phase based on current time
    const phase = getScoringPhase(now)
    
    console.log(`🏈 Starting pick scoring process...`)
    console.log(`📅 Phase: ${phase.name}`)
    console.log(`⏰ Time: ${now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT`)
    console.log(`📊 Week ${currentWeek}, Season ${currentSeason}`)
    
    // Note: Game scores should be updated from ESPN API before running this script
    console.log('ℹ️  Make sure to run update-scores-from-espn.js first to get latest scores')
    
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
      
      // Update the pick result
      await prisma.pick.update({
        where: { id: pick.id },
        data: { result: result }
      })
      
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
  
  // Calculate total points for over/under
  const totalPoints = homeScore + awayScore
  
  // Handle over/under picks
  if (pickType === 'over') {
    if (totalPoints === overUnder) return 'tie'
    return totalPoints > overUnder ? 'correct' : 'incorrect'
  } else if (pickType === 'under') {
    if (totalPoints === overUnder) return 'tie'
    return totalPoints < overUnder ? 'correct' : 'incorrect'
  }
  
  // Handle spread picks (home/away)
  // The spread represents how many points the home team is favored by
  // Negative spread = home team is favored by that many points
  // Positive spread = away team is favored by that many points
  
  const actualMargin = homeScore - awayScore
  const homeTeamSpread = Math.abs(spread || 0) // How many points home team is favored by (absolute value)
  
  if (pickType === 'home') {
    // User picked the home team
    // Home team covers if they win by MORE than the spread
    // Example: Eagles favored by 8.5, they need to win by 9+ to cover
    if (actualMargin === homeTeamSpread) return 'tie'
    return actualMargin > homeTeamSpread ? 'correct' : 'incorrect'
  } else if (pickType === 'away') {
    // User picked the away team  
    // Away team covers if they either win OR lose by less than the spread
    // Example: Eagles favored by 8.5, Cowboys cover if they lose by 8 or less
    if (actualMargin === homeTeamSpread) return 'tie'
    return actualMargin < homeTeamSpread ? 'correct' : 'incorrect'
  }
  
  return 'pending'
}

// Run the script
if (require.main === module) {
  scorePicks()
}

module.exports = { scorePicks }
