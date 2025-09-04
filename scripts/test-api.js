#!/usr/bin/env node

// Test script to verify API integration
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

async function testAPI() {
  console.log('🧪 Testing NFL API Integration')
  console.log('==============================\n')

  const apiKey = env.ODDS_API_KEY

  if (!apiKey) {
    console.log('❌ No API key found in .env.local')
    console.log('📝 To get real data:')
    console.log('   1. Go to https://the-odds-api.com/')
    console.log('   2. Get your free API key')
    console.log('   3. Add ODDS_API_KEY="your-key" to .env.local')
    console.log('   4. Restart the app')
    return
  }

  console.log('✅ API key found')
  console.log('🔄 Testing API connection...\n')

  try {
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
    
    console.log(`📅 Fetching games for current NFL week: ${startDate} to ${endDate}`)
    
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals&oddsFormat=american&commenceTimeFrom=${startDate}T00:00:00Z&commenceTimeTo=${endDate}T23:59:59Z`
    )

    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ Invalid API key')
        console.log('   Check your API key in .env.local')
      } else if (response.status === 429) {
        console.log('❌ Rate limit exceeded')
        console.log('   You may have used all your free requests')
      } else {
        console.log(`❌ API error: ${response.status}`)
      }
      return
    }

    const data = await response.json()
    
    console.log('✅ API connection successful!')
    console.log(`📊 Found ${data.length} NFL games`)
    
    if (data.length > 0) {
      const game = data[0]
      console.log('\n📋 Sample game data:')
      console.log(`   ${game.away_team} @ ${game.home_team}`)
      console.log(`   Game time: ${new Date(game.commence_time).toLocaleString()}`)
      
      if (game.bookmakers && game.bookmakers.length > 0) {
        const bookmaker = game.bookmakers[0]
        const spreadMarket = bookmaker.markets?.find(m => m.key === 'spreads')
        const totalMarket = bookmaker.markets?.find(m => m.key === 'totals')
        
        if (spreadMarket) {
          console.log(`   Spread: ${spreadMarket.outcomes[0].point}`)
        }
        if (totalMarket) {
          console.log(`   Total: ${totalMarket.outcomes[0].point}`)
        }
      }
    }

    console.log('\n🎉 Your app will now use real NFL data!')
    console.log('   Restart your development server to see the changes')

  } catch (error) {
    console.log('❌ Network error:', error.message)
    console.log('   Check your internet connection')
  }
}

testAPI()
