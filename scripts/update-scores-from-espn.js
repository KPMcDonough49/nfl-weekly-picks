#!/usr/bin/env node

/**
 * Script to update game scores from ESPN API
 * This can be run manually or scheduled as a cron job
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Function to fetch real-time game scores from ESPN API
async function fetchESPNGameScores() {
  try {
    console.log('Fetching real-time game scores from ESPN API...')
    
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`ESPN API request failed: ${response.status}`)
    }

    const data = await response.json()
    const games = data.events || []
    
    console.log(`Fetched ${games.length} games from ESPN API`)
    return games
  } catch (error) {
    console.error('Error fetching ESPN game scores:', error)
    return []
  }
}

// Function to update game scores in database using ESPN data
async function updateGameScoresFromESPN() {
  let updated = 0
  let errors = 0
  
  try {
    const espnGames = await fetchESPNGameScores()
    
    for (const espnGame of espnGames) {
      try {
        const competition = espnGame.competitions[0]
        if (!competition) continue
        
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home')
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away')
        
        if (!homeTeam || !awayTeam) continue
        
        // Map ESPN team abbreviations to our full team names
        const teamMapping = {
          'DAL': 'Dallas Cowboys',
          'PHI': 'Philadelphia Eagles',
          'KC': 'Kansas City Chiefs',
          'BUF': 'Buffalo Bills',
          'LAR': 'Los Angeles Rams',
          'SF': 'San Francisco 49ers',
          'NE': 'New England Patriots',
          'NYJ': 'New York Jets',
          'MIA': 'Miami Dolphins',
          'PIT': 'Pittsburgh Steelers',
          'BAL': 'Baltimore Ravens',
          'CLE': 'Cleveland Browns',
          'CIN': 'Cincinnati Bengals',
          'TEN': 'Tennessee Titans',
          'IND': 'Indianapolis Colts',
          'JAX': 'Jacksonville Jaguars',
          'HOU': 'Houston Texans',
          'DEN': 'Denver Broncos',
          'LAC': 'Los Angeles Chargers',
          'LV': 'Las Vegas Raiders',
          'NYG': 'New York Giants',
          'WAS': 'Washington Commanders',
          'GB': 'Green Bay Packers',
          'MIN': 'Minnesota Vikings',
          'CHI': 'Chicago Bears',
          'DET': 'Detroit Lions',
          'ATL': 'Atlanta Falcons',
          'NO': 'New Orleans Saints',
          'CAR': 'Carolina Panthers',
          'TB': 'Tampa Bay Buccaneers',
          'ARI': 'Arizona Cardinals',
          'SEA': 'Seattle Seahawks'
        }
        
        const homeTeamName = teamMapping[homeTeam.team.abbreviation] || homeTeam.team.displayName
        const awayTeamName = teamMapping[awayTeam.team.abbreviation] || awayTeam.team.displayName
        
        // Find the game in our database
        const game = await prisma.game.findFirst({
          where: {
            homeTeam: homeTeamName,
            awayTeam: awayTeamName,
            week: 1, // For now, assume Week 1
            season: 2025
          }
        })
        
        if (!game) {
          console.log(`Game not found in database: ${awayTeamName} @ ${homeTeamName}`)
          continue
        }
        
        // Determine game status
        let gameStatus = 'scheduled'
        if (espnGame.status.type.name === 'STATUS_FINAL') {
          gameStatus = 'final'
        } else if (espnGame.status.type.name === 'STATUS_IN_PROGRESS') {
          gameStatus = 'in_progress'
        }
        
        // Update the game with new scores and status
        const homeScore = parseInt(homeTeam.score) || 0
        const awayScore = parseInt(awayTeam.score) || 0
        
        await prisma.game.update({
          where: { id: game.id },
          data: {
            status: gameStatus,
            homeScore: homeScore,
            awayScore: awayScore
          }
        })
        
        console.log(`Updated game: ${awayTeamName} @ ${homeTeamName} - ${awayScore}-${homeScore} (${gameStatus})`)
        updated++
        
      } catch (error) {
        console.error(`Error updating game ${espnGame.name}:`, error)
        errors++
      }
    }
    
  } catch (error) {
    console.error('Error in updateGameScoresFromESPN:', error)
    errors++
  } finally {
    await prisma.$disconnect()
  }
  
  return { updated, errors }
}

// Run the update
async function main() {
  console.log('🔄 Starting ESPN score update...')
  const result = await updateGameScoresFromESPN()
  console.log(`✅ Updated ${result.updated} games, ${result.errors} errors`)
}

main().catch(console.error)
