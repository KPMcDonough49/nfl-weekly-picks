#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🏈 NFL Picks App Setup')
console.log('=====================\n')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local already exists')
} else {
  console.log('📝 Creating .env.local file...')
  
  const envContent = `# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="${generateRandomSecret()}"
NEXTAUTH_URL="http://localhost:3000"

# The Odds API - Get your free API key at https://the-odds-api.com/
# ODDS_API_KEY="your-odds-api-key-here"
`

  fs.writeFileSync(envPath, envContent)
  console.log('✅ Created .env.local with default values')
  console.log('⚠️  Remember to add your ODDS_API_KEY to get real NFL data!')
}

// Check if database exists
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
if (fs.existsSync(dbPath)) {
  console.log('✅ Database already exists')
} else {
  console.log('📊 Setting up database...')
  console.log('   Run: npx prisma db push')
}

console.log('\n🚀 Next steps:')
console.log('1. Get your free API key from https://the-odds-api.com/')
console.log('2. Add ODDS_API_KEY to your .env.local file')
console.log('3. Run: npm run dev')
console.log('4. Open http://localhost:3000')

function generateRandomSecret() {
  return require('crypto').randomBytes(32).toString('hex')
}
