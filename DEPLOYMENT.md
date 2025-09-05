# Production Deployment Guide

## Vercel Deployment

### 1. Prerequisites
- GitHub repository (✅ Already done)
- Vercel account (free tier available)

### 2. Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com) and sign up/login**
2. **Click "New Project"**
3. **Import your GitHub repository**: `KPMcDonough49/nfl-weekly-picks`
4. **Configure the project**:
   - Framework Preset: Next.js
   - Root Directory: `./` (default)
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)

### 3. Environment Variables

Add these environment variables in Vercel dashboard:

```
DATABASE_URL=your_production_database_url
ODDS_API_KEY=your_odds_api_key
ESPN_API_KEY=your_espn_api_key
NEXTAUTH_SECRET=your_random_secret_string
NEXTAUTH_URL=https://your-app-name.vercel.app
```

### 4. Database Setup

For production, you'll need a PostgreSQL database. Options:
- **Vercel Postgres** (recommended - integrates seamlessly)
- **PlanetScale** (MySQL)
- **Railway** (PostgreSQL)
- **Supabase** (PostgreSQL)

### 5. Production Database Migration

After setting up the database:

```bash
# Update prisma/schema.prisma for production
# Change provider from "sqlite" to "postgresql"
# Update DATABASE_URL to your production database

# Run migrations
npx prisma migrate deploy
npx prisma generate
```

### 6. Automated Scoring Setup

For production, you'll need to set up the cron job on a service like:
- **Vercel Cron Jobs** (recommended)
- **GitHub Actions**
- **Railway Cron**
- **Heroku Scheduler**

### 7. Domain Setup (Optional)

- Custom domain can be added in Vercel dashboard
- SSL certificates are automatically handled

## Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Environment variables set
- [ ] Cron job configured for automated scoring
- [ ] Test user registration and picks
- [ ] Verify ESPN API integration
- [ ] Test scoring system with real games

## Monitoring

- Vercel provides built-in analytics
- Check function logs for any errors
- Monitor database performance
- Set up alerts for cron job failures
