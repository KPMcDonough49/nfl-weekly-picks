#!/usr/bin/env node

/**
 * Script to check the status of automated scoring
 * Shows recent scoring runs and cron job status
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function checkScoringStatus() {
  try {
    console.log('🔍 Checking automated scoring status...\n')
    
    // Check if cron jobs are set up
    console.log('📅 Cron Jobs Status:')
    try {
      const crontab = execSync('crontab -l', { encoding: 'utf8' })
      const scoringJobs = crontab.split('\n').filter(line => 
        line.includes('npm run score:picks')
      )
      
      if (scoringJobs.length > 0) {
        console.log('✅ Automated scoring is set up')
        console.log(`   ${scoringJobs.length} cron jobs configured`)
        scoringJobs.forEach((job, index) => {
          console.log(`   ${index + 1}. ${job}`)
        })
      } else {
        console.log('❌ No automated scoring cron jobs found')
        console.log('   Run: npm run setup:cron')
      }
    } catch (error) {
      console.log('❌ No crontab found')
      console.log('   Run: npm run setup:cron')
    }
    
    // Check scoring logs
    console.log('\n📝 Recent Scoring Activity:')
    const logFile = path.join(__dirname, '..', 'logs', 'scoring.log')
    
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8')
      const lines = logContent.split('\n').filter(line => line.trim())
      
      if (lines.length > 0) {
        console.log('✅ Scoring logs found')
        console.log(`   ${lines.length} log entries`)
        
        // Show last 5 scoring runs
        const scoringRuns = lines.filter(line => 
          line.includes('Starting pick scoring process') || 
          line.includes('Scoring complete')
        ).slice(-10)
        
        if (scoringRuns.length > 0) {
          console.log('\n   Recent runs:')
          scoringRuns.forEach(run => {
            const timestamp = run.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)?.[0]
            const status = run.includes('complete') ? '✅' : '🏃'
            console.log(`   ${status} ${timestamp || 'Unknown time'}`)
          })
        }
      } else {
        console.log('📝 No scoring activity yet')
      }
    } else {
      console.log('📝 No scoring logs found yet')
      console.log('   Logs will appear after first automated run')
    }
    
    // Show next scheduled runs
    console.log('\n⏰ Next Scheduled Runs:')
    const now = new Date()
    const ptTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}))
    
    const nextRuns = [
      { name: 'Thursday Midnight', day: 4, hour: 0, minute: 0 },
      { name: 'Sunday 2PM', day: 0, hour: 14, minute: 0 },
      { name: 'Sunday Midnight', day: 1, hour: 0, minute: 0 },
      { name: 'Monday Midnight', day: 2, hour: 0, minute: 0 }
    ]
    
    nextRuns.forEach(run => {
      const nextRun = getNextRunTime(run.day, run.hour, run.minute, ptTime)
      const timeUntil = getTimeUntil(nextRun, ptTime)
      console.log(`   ${run.name}: ${nextRun.toLocaleDateString()} ${nextRun.toLocaleTimeString()} PT (${timeUntil})`)
    })
    
    console.log('\n💡 Commands:')
    console.log('   npm run setup:cron    - Set up automated scoring')
    console.log('   npm run score:picks   - Run scoring manually')
    console.log('   crontab -l            - View all cron jobs')
    console.log('   crontab -r            - Remove all cron jobs')
    
  } catch (error) {
    console.error('❌ Error checking scoring status:', error.message)
  }
}

function getNextRunTime(dayOfWeek, hour, minute, fromTime) {
  const nextRun = new Date(fromTime)
  const currentDay = nextRun.getDay()
  const currentHour = nextRun.getHours()
  const currentMinute = nextRun.getMinutes()
  
  // Calculate days until next run
  let daysUntil = (dayOfWeek - currentDay + 7) % 7
  
  // If it's the same day, check if time has passed
  if (daysUntil === 0) {
    if (currentHour > hour || (currentHour === hour && currentMinute >= minute)) {
      daysUntil = 7 // Next week
    }
  }
  
  nextRun.setDate(nextRun.getDate() + daysUntil)
  nextRun.setHours(hour, minute, 0, 0)
  
  return nextRun
}

function getTimeUntil(targetTime, fromTime) {
  const diff = targetTime - fromTime
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

// Run the check
if (require.main === module) {
  checkScoringStatus()
}

module.exports = { checkScoringStatus }
