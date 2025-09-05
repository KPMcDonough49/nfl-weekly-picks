// NFL API integration for fetching games and betting lines
// Using The Odds API for real NFL data

import { getCachedData, setCachedData, generateCacheKey, checkRateLimit, handleAPIError, isWednesday, getWednesdayOfWeek, getCachedFileData } from './api-utils'

export interface NFLGame {
  id: string
  week: number
  season: number
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  spread?: number
  overUnder?: number
  gameTime: string
  status: 'scheduled' | 'in_progress' | 'final'
}

export interface Team {
  id: string
  name: string
  abbreviation: string
  city: string
}

// Mock team data
export const NFL_TEAMS: Team[] = [
  { id: '1', name: 'Chiefs', abbreviation: 'KC', city: 'Kansas City' },
  { id: '2', name: 'Bills', abbreviation: 'BUF', city: 'Buffalo' },
  { id: '3', name: 'Cowboys', abbreviation: 'DAL', city: 'Dallas' },
  { id: '4', name: 'Eagles', abbreviation: 'PHI', city: 'Philadelphia' },
  { id: '5', name: 'Rams', abbreviation: 'LAR', city: 'Los Angeles' },
  { id: '6', name: '49ers', abbreviation: 'SF', city: 'San Francisco' },
  { id: '7', name: 'Patriots', abbreviation: 'NE', city: 'New England' },
  { id: '8', name: 'Jets', abbreviation: 'NYJ', city: 'New York' },
  { id: '9', name: 'Dolphins', abbreviation: 'MIA', city: 'Miami' },
  { id: '10', name: 'Bills', abbreviation: 'BUF', city: 'Buffalo' },
  { id: '11', name: 'Steelers', abbreviation: 'PIT', city: 'Pittsburgh' },
  { id: '12', name: 'Ravens', abbreviation: 'BAL', city: 'Baltimore' },
  { id: '13', name: 'Browns', abbreviation: 'CLE', city: 'Cleveland' },
  { id: '14', name: 'Bengals', abbreviation: 'CIN', city: 'Cincinnati' },
  { id: '15', name: 'Titans', abbreviation: 'TEN', city: 'Tennessee' },
  { id: '16', name: 'Colts', abbreviation: 'IND', city: 'Indianapolis' },
  { id: '17', name: 'Jaguars', abbreviation: 'JAX', city: 'Jacksonville' },
  { id: '18', name: 'Texans', abbreviation: 'HOU', city: 'Houston' },
  { id: '19', name: 'Broncos', abbreviation: 'DEN', city: 'Denver' },
  { id: '20', name: 'Chargers', abbreviation: 'LAC', city: 'Los Angeles' },
  { id: '21', name: 'Raiders', abbreviation: 'LV', city: 'Las Vegas' },
  { id: '22', name: 'Giants', abbreviation: 'NYG', city: 'New York' },
  { id: '23', name: 'Commanders', abbreviation: 'WAS', city: 'Washington' },
  { id: '24', name: 'Packers', abbreviation: 'GB', city: 'Green Bay' },
  { id: '25', name: 'Vikings', abbreviation: 'MIN', city: 'Minnesota' },
  { id: '26', name: 'Bears', abbreviation: 'CHI', city: 'Chicago' },
  { id: '27', name: 'Lions', abbreviation: 'DET', city: 'Detroit' },
  { id: '28', name: 'Falcons', abbreviation: 'ATL', city: 'Atlanta' },
  { id: '29', name: 'Saints', abbreviation: 'NO', city: 'New Orleans' },
  { id: '30', name: 'Panthers', abbreviation: 'CAR', city: 'Carolina' },
  { id: '31', name: 'Buccaneers', abbreviation: 'TB', city: 'Tampa Bay' },
  { id: '32', name: 'Cardinals', abbreviation: 'ARI', city: 'Arizona' },
]

// Helper function to get the start of the current NFL week (Thursday)
function getWeekStartDate(date: Date): Date {
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToThursday = (4 - dayOfWeek + 7) % 7 // Days until next Thursday (4 = Thursday)
  
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() + daysToThursday)
  weekStart.setHours(0, 0, 0, 0)
  
  return weekStart
}

// Transform API data to our game format
function transformAPIDataToGames(oddsData: any[], week: number, season: number): NFLGame[] {
  return oddsData.map((game: any) => {
    // Extract spread and total from the first bookmaker
    const bookmaker = game.bookmakers?.[0]
    const spreadMarket = bookmaker?.markets?.find((m: any) => m.key === 'spreads')
    const totalMarket = bookmaker?.markets?.find((m: any) => m.key === 'totals')
    
    
    // Get the raw spread value
    const rawSpread = spreadMarket?.outcomes?.[0]?.point || 0
    const overUnder = totalMarket?.outcomes?.[0]?.point || 0
    
    // The API returns spreads where each outcome has a point value
    // Negative point = team is favored (giving points)
    // Positive point = team is underdog (getting points)
    // We need to find the home team's spread value
    let homeSpread: number = 0
    
    if (spreadMarket?.outcomes) {
      // Find the home team's outcome
      const homeTeamOutcome = spreadMarket.outcomes.find((o: any) => o.name === game.home_team)
      if (homeTeamOutcome) {
        // Use the home team's spread value directly (no sign flip needed)
        homeSpread = homeTeamOutcome.point || 0
      } else {
        // Fallback: if we can't find home team, use the first outcome's point
        homeSpread = spreadMarket.outcomes[0]?.point || 0
      }
    }
    
    return {
      id: game.id,
      week,
      season,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      spread: homeSpread,
      overUnder: overUnder,
      gameTime: game.commence_time,
      status: 'scheduled'
    }
  })
}

// Function to get current NFL season and week
export function getCurrentSeasonAndWeek(): { season: number; week: number } {
  const now = new Date()
  const year = now.getFullYear()
  
  // NFL season typically starts in September
  if (now.getMonth() >= 8) { // September or later
    // NFL Week 1 typically starts on the first Thursday of September
    // For 2025, let's assume Week 1 starts September 4th (Thursday)
    const seasonStart = new Date(year, 8, 4) // September 4th, 2025
    
    // Calculate days since season start
    const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (24 * 60 * 60 * 1000))
    
    // NFL weeks run Thursday to Monday (5 days), then Tuesday-Wednesday are "off days"
    // So we need to account for the 5-day week cycle
    if (daysSinceStart < 0) {
      // Before season starts
      return { season: year - 1, week: 18 }
    } else if (daysSinceStart < 5) {
      // Week 1 (Thursday to Monday)
      return { season: year, week: 1 }
    } else {
      // Calculate which week we're in
      // Each week is 7 days, but we need to account for the Thursday start
      const weekNumber = Math.floor((daysSinceStart - 5) / 7) + 2
      return { season: year, week: Math.min(18, Math.max(1, weekNumber)) }
    }
  } else {
    return { season: year - 1, week: 18 } // Previous season
  }
}

// Function to fetch real NFL games and odds from The Odds API
export async function fetchGamesForWeek(week: number, season: number): Promise<NFLGame[]> {
  const apiKey = process.env.ODDS_API_KEY
  
  if (!apiKey) {
    console.warn('ODDS_API_KEY not found, falling back to mock data')
    return fetchMockGamesForWeek(week, season)
  }

  // Check cached file data first (from Wednesday fetch)
  const cachedFileData = getCachedFileData()
  if (cachedFileData) {
    console.log('Returning cached NFL data from file')
    return transformAPIDataToGames(cachedFileData, week, season)
  }
  
  // Check in-memory cache as fallback
  const cacheKey = generateCacheKey(week, season)
  const cachedData = getCachedData(cacheKey)
  if (cachedData) {
    console.log('Returning cached NFL data from memory')
    return cachedData
  }
  
  // Only fetch from API if we have no cached data
  console.log('No cached data found - fetching from API')

  // Check rate limit
  if (!checkRateLimit(apiKey, 10, 60000)) {
    console.warn('Rate limit exceeded, falling back to mock data')
    return fetchMockGamesForWeek(week, season)
  }

  try {
    // Calculate the requested NFL week's date range (Thursday to Monday)
    // NFL Week 1 starts September 4th, 2025 (Thursday)
    const seasonStart = new Date(season, 8, 4) // September 4th
    
    // Calculate the start date for the requested week
    let weekStartDate
    if (week === 1) {
      weekStartDate = seasonStart
    } else {
      // Each week after Week 1 starts 7 days after the previous week
      const daysToAdd = (week - 1) * 7
      weekStartDate = new Date(seasonStart)
      weekStartDate.setDate(seasonStart.getDate() + daysToAdd)
    }
    
    // Week runs Thursday to Monday (5 days)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 5)
    
    // Format dates for API (ISO format)
    const startDate = weekStartDate.toISOString().split('T')[0]
    const endDate = weekEndDate.toISOString().split('T')[0]
    
    console.log(`Fetching NFL games for Week ${week}: ${startDate} to ${endDate}`)
    
    // Fetch NFL odds from The Odds API for current week only (Thursday to Monday)
    // Note: This API only returns upcoming games, not completed ones
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals&oddsFormat=american&commenceTimeFrom=${startDate}T00:00:00Z&commenceTimeTo=${endDate}T23:59:59Z`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      } else {
        throw new Error(`API request failed: ${response.status}`)
      }
    }

    const oddsData = await response.json()
    
    
    // Transform API data to our format
    let games = transformAPIDataToGames(oddsData, week, season)

    // For Week 1, add the Eagles vs Cowboys game that already happened
    // This is a workaround since The Odds API doesn't return completed games
    if (week === 1 && season === 2025) {
      const eaglesGame: NFLGame = {
        id: 'eagles-cowboys-2025-week1',
        week: 1,
        season: 2025,
        homeTeam: 'Philadelphia Eagles',
        awayTeam: 'Dallas Cowboys',
        homeScore: 34,
        awayScore: 30,
        spread: -8.5,
        overUnder: 47.5,
        gameTime: '2025-09-05T21:00:00.000Z',
        status: 'final'
      }
      
      // Check if Eagles game already exists
      const hasEaglesGame = games.some(game => 
        game.homeTeam.includes('Eagles') || game.awayTeam.includes('Eagles') ||
        game.homeTeam.includes('Cowboys') || game.awayTeam.includes('Cowboys')
      )
      
      if (!hasEaglesGame) {
        games.unshift(eaglesGame) // Add to beginning of array
        console.log('Added Eagles vs Cowboys game (already completed)')
      }
    }

    // Cache the results
    setCachedData(cacheKey, games)
    console.log(`Fetched ${games.length} NFL games from API`)
    
    return games
  } catch (error) {
    console.error('Error fetching real NFL data:', error)
    console.log('Falling back to mock data')
    return fetchMockGamesForWeek(week, season)
  }
}

// Fallback mock data function
function fetchMockGamesForWeek(week: number, season: number): NFLGame[] {
  const mockGames: NFLGame[] = [
    {
      id: `game-${week}-1`,
      week,
      season,
      homeTeam: 'Chiefs',
      awayTeam: 'Bills',
      spread: -3.5,
      overUnder: 48.5,
      gameTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled'
    },
    {
      id: `game-${week}-2`,
      week,
      season,
      homeTeam: 'Cowboys',
      awayTeam: 'Eagles',
      spread: -2.5,
      overUnder: 52.0,
      gameTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled'
    },
    {
      id: `game-${week}-3`,
      week,
      season,
      homeTeam: 'Rams',
      awayTeam: '49ers',
      spread: 3.0,
      overUnder: 45.5,
      gameTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled'
    },
    {
      id: `game-${week}-4`,
      week,
      season,
      homeTeam: 'Patriots',
      awayTeam: 'Jets',
      spread: -1.5,
      overUnder: 38.0,
      gameTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled'
    },
    {
      id: `game-${week}-5`,
      week,
      season,
      homeTeam: 'Dolphins',
      awayTeam: 'Bills',
      spread: 2.5,
      overUnder: 44.5,
      gameTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled'
    },
    {
      id: `game-${week}-6`,
      week,
      season,
      homeTeam: 'Steelers',
      awayTeam: 'Ravens',
      spread: -3.0,
      overUnder: 42.0,
      gameTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled'
    }
  ]

  return mockGames
}

// Function to check if picks are locked (before 1pm Sunday)
export function arePicksLocked(): boolean {
  const now = new Date()
  const sunday1pm = new Date()
  
  // Set to next Sunday at 1pm
  const daysUntilSunday = (7 - now.getDay()) % 7
  sunday1pm.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday))
  sunday1pm.setHours(13, 0, 0, 0) // 1pm
  
  return now > sunday1pm
}

// Function to get time until picks lock
export function getTimeUntilPicksLock(): string {
  const now = new Date()
  const sunday1pm = new Date()
  
  const daysUntilSunday = (7 - now.getDay()) % 7
  sunday1pm.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday))
  sunday1pm.setHours(13, 0, 0, 0)
  
  const diff = sunday1pm.getTime() - now.getTime()
  
  if (diff <= 0) {
    return 'Picks are locked'
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

// ESPN API integration for real-time scores
export interface ESPNGame {
  id: string
  name: string
  shortName: string
  status: {
    type: {
      name: string
      state: string
      completed: boolean
    }
  }
  competitions: Array<{
    competitors: Array<{
      id: string
      homeAway: 'home' | 'away'
      team: {
        id: string
        abbreviation: string
        displayName: string
      }
      score: string
    }>
  }>
}

// Function to fetch real-time game scores from ESPN API
export async function fetchESPNGameScores(): Promise<ESPNGame[]> {
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
export async function updateGameScoresFromESPN(): Promise<{ updated: number; errors: number }> {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  
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
        
        // Map ESPN team abbreviations to our team names
        const teamMapping: { [key: string]: string } = {
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
        let gameStatus: 'scheduled' | 'in_progress' | 'final' = 'scheduled'
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
