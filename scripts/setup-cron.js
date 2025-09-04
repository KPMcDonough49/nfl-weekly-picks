#!/usr/bin/env node

/**
 * Script to set up automated scoring with cron jobs
 * This creates the cron entries for the weekly scoring schedule
 */

const { execSync } = require('child_process')
const path = require('path')

const cronJobs = [
  // Thursday 12:00 AM PT (8:00 AM UTC)
  '0 8 * * 4 cd /Users/kevinmcdonough/Documents/App\\ Playground/betting\\ app && npm run score:picks >> logs/scoring.log 2>&1',
  
  // Sunday 2:00 PM PT (9:00 PM UTC)
  '0 21 * * 0 cd /Users/kevinmcdonough/Documents/App\\ Playground/betting\\ app && npm run score:picks >> logs/scoring.log 2>&1',
  
  // Sunday 12:00 AM PT (8:00 AM UTC Monday)
  '0 8 * * 1 cd /Users/kevinmcdonough/Documents/App\\ Playground/betting\\ app && npm run score:picks >> logs/scoring.log 2>&1',
  
  // Monday 12:00 AM PT (8:00 AM UTC Tuesday)
  '0 8 * * 2 cd /Users/kevinmcdonough/Documents/App\\ Playground/betting\\ app && npm run score:picks >> logs/scoring.log 2>&1'
]

function setupCronJobs() {
  try {
    console.log('Setting up automated scoring cron jobs...')
    
    // Create logs directory if it doesn't exist
    try {
      execSync('mkdir -p logs', { stdio: 'ignore' })
      console.log('✅ Created logs directory')
    } catch (error) {
      // Directory might already exist
    }
    
    // Get current crontab
    let currentCrontab = ''
    try {
      currentCrontab = execSync('crontab -l', { encoding: 'utf8' })
    } catch (error) {
      // No existing crontab
      currentCrontab = ''
    }
    
    // Remove any existing scoring jobs
    const lines = currentCrontab.split('\n')
    const filteredLines = lines.filter(line => 
      !line.includes('npm run score:picks') && 
      !line.includes('betting app')
    )
    
    // Add new scoring jobs
    const newCrontab = [
      ...filteredLines,
      '',
      '# NFL Betting App - Automated Scoring',
      '# Thursday 12:00 AM PT, Sunday 2:00 PM PT, Sunday 12:00 AM PT, Monday 12:00 AM PT',
      ...cronJobs
    ].join('\n')
    
    // Write new crontab
    execSync('echo "' + newCrontab + '" | crontab -', { stdio: 'pipe' })
    
    console.log('✅ Cron jobs set up successfully!')
    console.log('\n📅 Scoring Schedule:')
    console.log('   Thursday 12:00 AM PT  - Score early games')
    console.log('   Sunday 2:00 PM PT     - Score pre-Sunday games')
    console.log('   Sunday 12:00 AM PT    - Score Sunday games')
    console.log('   Monday 12:00 AM PT    - Score Monday games & finalize')
    console.log('\n📝 Logs will be saved to: logs/scoring.log')
    console.log('\n🔍 To view current cron jobs: crontab -l')
    console.log('🗑️  To remove cron jobs: crontab -r')
    
  } catch (error) {
    console.error('❌ Error setting up cron jobs:', error.message)
    console.log('\n💡 Manual setup instructions:')
    console.log('1. Run: crontab -e')
    console.log('2. Add these lines:')
    cronJobs.forEach(job => console.log('   ' + job))
  }
}

// Run the setup
if (require.main === module) {
  setupCronJobs()
}

module.exports = { setupCronJobs }
