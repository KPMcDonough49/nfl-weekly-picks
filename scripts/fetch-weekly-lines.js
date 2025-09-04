#!/usr/bin/env node

// Script to fetch NFL lines on Wednesday and cache them for the week
// This can be run as a cron job or scheduled task

const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    return {}
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const env = {}
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
    }
  })
  
  return env
}

const env = loadEnv()

async function fetchWeeklyLines() {
  console.log('🏈 Fetching NFL lines for the week...')
  console.log('=====================================\n')

  const apiKey = env.ODDS_API_KEY

  if (!apiKey) {
    console.log('❌ No API key found in .env.local')
    console.log('   Add ODDS_API_KEY to your .env.local file')
    return
  }

  // Calculate current NFL week (Thursday to Monday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToThursday = (4 - dayOfWeek + 7) % 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + daysToThursday)
  weekStart.setHours(0, 0, 0, 0)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 5) // Thursday to Monday
  
  const startDate = weekStart.toISOString().split('T')[0]
  const endDate = weekEnd.toISOString().split('T')[0]
  
  console.log(`📅 Fetching games for NFL week: ${startDate} to ${endDate}`)

  try {
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals&oddsFormat=american&commenceTimeFrom=${startDate}T00:00:00Z&commenceTimeTo=${endDate}T23:59:59Z`
    )

    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ Invalid API key')
        return
      } else if (response.status === 429) {
        console.log('❌ Rate limit exceeded')
        return
      } else {
        console.log(`❌ API error: ${response.status}`)
        return
      }
    }

    const data = await response.json()
    
    console.log(`✅ Successfully fetched ${data.length} NFL games`)
    
    if (data.length > 0) {
      console.log('\n📋 Sample games:')
      data.slice(0, 3).forEach((game, index) => {
        console.log(`   ${index + 1}. ${game.away_team} @ ${game.home_team}`)
        console.log(`      Time: ${new Date(game.commence_time).toLocaleString()}`)
      })
    }

    // Save to cache file for the app to use
    const cacheData = {
      games: data,
      fetchedAt: new Date().toISOString(),
      weekStart: startDate,
      weekEnd: endDate
    }

    const cacheDir = path.join(process.cwd(), '.cache')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir)
    }

    const cacheFile = path.join(cacheDir, 'nfl-games-cache.json')
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))

    console.log(`\n💾 Cached data saved to: ${cacheFile}`)
    console.log('🎉 Weekly lines fetched and cached successfully!')
    console.log('\n📊 API Usage:')
    console.log(`   - Games fetched: ${data.length}`)
    console.log(`   - Date range: ${startDate} to ${endDate}`)
    console.log(`   - Cache expires: Next Wednesday`)

  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

// Check if it's Wednesday
const today = new Date()
const isWednesday = today.getDay() === 3

if (isWednesday) {
  console.log('📅 It\'s Wednesday - perfect time to fetch weekly lines!')
  fetchWeeklyLines()
} else {
  const daysUntilWednesday = (3 - today.getDay() + 7) % 7
  console.log(`📅 Today is ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]}`)
  console.log(`⏰ This script should be run on Wednesday (${daysUntilWednesday} days from now)`)
  console.log('\n💡 To run anyway (for testing), uncomment the line below:')
  console.log('// fetchWeeklyLines()')
  
  // Uncomment the line below to run anyway (for testing)
  // fetchWeeklyLines()
}
