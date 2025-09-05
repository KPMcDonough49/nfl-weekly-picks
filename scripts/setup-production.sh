#!/bin/bash

# Production Setup Script for NFL Betting App
# This script helps set up the production environment

echo "🚀 Setting up NFL Betting App for Production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL environment variable not set"
    echo "   You'll need to set this to your production database URL"
    echo "   Example: postgresql://user:password@host:port/database"
fi

# Copy production schema
echo "📋 Setting up production database schema..."
cp prisma/schema.production.prisma prisma/schema.prisma

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "✅ Production setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up your production database (PostgreSQL)"
echo "2. Set environment variables in Vercel dashboard"
echo "3. Deploy to Vercel"
echo "4. Set up cron job for automated scoring"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"
