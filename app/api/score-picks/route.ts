import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateGameScoresFromESPN } from '@/lib/nfl-api'

export async function POST(request: NextRequest) {
  try {
    // First, update game scores from ESPN
    console.log('🔄 Updating game scores from ESPN...')
    const scoreUpdateResult = await updateGameScoresFromESPN()
    console.log(`✅ Updated ${scoreUpdateResult.updated} games, ${scoreUpdateResult.errors} errors`)
    
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    const season = searchParams.get('season')
    const groupId = searchParams.get('groupId')

    // If no week/season provided, use current week/season
    let targetWeek: number
    let targetSeason: number
    
    if (!week || !season) {
      const now = new Date()
      const year = now.getFullYear()
      
      // NFL Week 1 typically starts on the first Thursday of September
      // For 2025, let's assume Week 1 starts September 4th (Thursday)
      const seasonStart = new Date(year, 8, 4) // September 4th
      
      if (now >= seasonStart) {
        // Current season
        const weekStart = new Date(seasonStart)
        let weekNumber = 1
        
        while (weekStart <= now && weekNumber <= 18) {
          weekStart.setDate(weekStart.getDate() + 7)
          weekNumber++
        }
        
        targetWeek = Math.min(18, Math.max(1, weekNumber - 1))
        targetSeason = year
      } else {
        // Previous season
        targetWeek = 18
        targetSeason = year - 1
      }
    } else {
      targetWeek = parseInt(week)
      targetSeason = parseInt(season)
    }

    // Get all completed games for this week
    const completedGames = await prisma.game.findMany({
      where: {
        week: targetWeek,
        season: targetSeason,
        status: 'final',
        homeScore: { not: null },
        awayScore: { not: null }
      }
    })

    if (completedGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed games found for this week',
        data: { gamesProcessed: 0, week: targetWeek, season: targetSeason }
      })
    }

    // Get all picks for this week
    const whereClause: any = {
      gameId: { in: completedGames.map(g => g.id) }
    }
    
    if (groupId) {
      whereClause.groupId = groupId
    }

    const picks = await prisma.pick.findMany({
      where: whereClause,
      include: {
        user: true,
        group: true
      }
    })

    // Convert picks to team names for scoring
    const picksWithTeamNames = picks.map(pick => {
      const game = completedGames.find(g => g.id === pick.gameId)
      if (!game) return pick

      // Convert pick value to actual team name
      let teamPick = pick.pick
      if (pick.pick === 'home') {
        teamPick = game.homeTeam
      } else if (pick.pick === 'away') {
        teamPick = game.awayTeam
      }

      return {
        ...pick,
        pick: teamPick
      }
    })

    let totalPicksProcessed = 0
    let totalScoresUpdated = 0

    // Process each pick
    for (const pick of picksWithTeamNames) {
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
              week: targetWeek,
              season: targetSeason
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
            week: targetWeek,
            season: targetSeason,
            wins: result === 'correct' ? 1 : 0,
            losses: result === 'incorrect' ? 1 : 0,
            ties: result === 'tie' ? 1 : 0
          }
        })
        totalScoresUpdated++
      }
      
      totalPicksProcessed++
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${scoreUpdateResult.updated} games from ESPN, processed ${totalPicksProcessed} picks and updated ${totalScoresUpdated} scores`,
      data: {
        gamesUpdatedFromESPN: scoreUpdateResult.updated,
        espnUpdateErrors: scoreUpdateResult.errors,
        gamesProcessed: completedGames.length,
        picksProcessed: totalPicksProcessed,
        scoresUpdated: totalScoresUpdated
      }
    })

  } catch (error) {
    console.error('Error scoring picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to score picks' },
      { status: 500 }
    )
  }
}

function gradePick(pick: any, game: any): 'correct' | 'incorrect' | 'tie' | 'pending' {
  const { pick: pickType, gameId } = pick
  const { homeScore, awayScore, overUnder, homeTeam, awayTeam } = game

  if (!homeScore || !awayScore) {
    return 'pending'
  }

  const spread = game.spread || 0
  const actualSpread = homeScore - awayScore // Positive = home won, Negative = away won
  
  // Calculate total points for over/under
  const totalPoints = homeScore + awayScore
  
  // Grade the pick based on what was actually picked
  if (pickType === homeTeam) {
    // User picked home team
    if (spread < 0) {
      // Home team is favored (negative spread means home team favored)
      if (actualSpread > Math.abs(spread)) {
        return 'correct' // Home team won by more than spread
      } else if (actualSpread === Math.abs(spread)) {
        return 'tie' // Home team won by exactly the spread
      } else {
        return 'incorrect' // Home team won by less than spread (or lost)
      }
    } else if (spread > 0) {
      // Home team is underdog (positive spread means away team favored)
      if (actualSpread > 0) {
        return 'correct' // Home team won (underdog won)
      } else if (actualSpread === 0) {
        return 'tie' // Tied game
      } else {
        // Home team lost, check if they covered
        if (Math.abs(actualSpread) < spread) {
          return 'correct' // Home team lost by less than spread (covered)
        } else if (Math.abs(actualSpread) === spread) {
          return 'tie' // Home team lost by exactly the spread
        } else {
          return 'incorrect' // Home team lost by more than spread
        }
      }
    } else {
      // Even spread (pick'em)
      if (actualSpread > 0) {
        return 'correct' // Home team won
      } else if (actualSpread < 0) {
        return 'incorrect' // Home team lost
      } else {
        return 'tie' // Tied game
      }
    }
  } else if (pickType === awayTeam) {
    // User picked away team
    if (spread > 0) {
      // Away team is favored (positive spread means away team favored)
      if (actualSpread < -spread) {
        return 'correct' // Away team won by more than spread
      } else if (actualSpread === -spread) {
        return 'tie' // Away team won by exactly the spread
      } else {
        return 'incorrect' // Away team won by less than spread (or lost)
      }
    } else if (spread < 0) {
      // Away team is underdog (negative spread means home team favored)
      if (actualSpread < 0) {
        return 'correct' // Away team won (underdog won)
      } else if (actualSpread === 0) {
        return 'tie' // Tied game
      } else {
        // Away team lost, check if they covered
        if (actualSpread < Math.abs(spread)) {
          return 'correct' // Away team lost by less than spread (covered)
        } else if (actualSpread === Math.abs(spread)) {
          return 'tie' // Away team lost by exactly the spread
        } else {
          return 'incorrect' // Away team lost by more than spread
        }
      }
    } else {
      // Even spread (pick'em)
      if (actualSpread < 0) {
        return 'correct' // Away team won
      } else if (actualSpread > 0) {
        return 'incorrect' // Away team lost
      } else {
        return 'tie' // Tied game
      }
    }
  } else if (pickType === 'over') {
    if (totalPoints > overUnder) {
      return 'correct'
    } else if (totalPoints < overUnder) {
      return 'incorrect'
    } else {
      return 'tie'
    }
  } else if (pickType === 'under') {
    if (totalPoints < overUnder) {
      return 'correct'
    } else if (totalPoints > overUnder) {
      return 'incorrect'
    } else {
      return 'tie'
    }
  }

  return 'pending'
}
