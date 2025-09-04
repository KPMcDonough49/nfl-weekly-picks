# 🏈 Real NFL Data Setup Guide

This guide will help you replace the mock data with real NFL games and betting lines.

## 🚀 Quick Start

### 1. Get Your Free API Key

1. Go to [The Odds API](https://the-odds-api.com/)
2. Click "Get Free API Key"
3. Sign up with your email
4. Copy your API key from the dashboard

**Free Tier Includes:**
- 500 requests per month
- Real-time NFL odds
- Spreads and totals from major sportsbooks
- No credit card required

### 2. Set Up Environment Variables

Create a `.env.local` file in your project root:

```bash
# Run the setup script
npm run setup
```

Or manually create `.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# The Odds API
ODDS_API_KEY="your-odds-api-key-here"
```

### 3. Test the Integration

```bash
# Start the development server
npm run dev
```

Visit `http://localhost:3000` and check the browser console for:
- ✅ "Fetched X NFL games from API" (real data)
- ⚠️ "ODDS_API_KEY not found, falling back to mock data" (still using mock)

## 🔧 How It Works

### Automatic Fallback System

The app is designed to work seamlessly:

1. **With API Key**: Fetches real NFL data from The Odds API
2. **Without API Key**: Falls back to mock data automatically
3. **API Errors**: Automatically falls back to mock data
4. **Rate Limiting**: Caches data and respects API limits

### Data Flow

```
User visits page
    ↓
Check cache (5 min TTL)
    ↓
If cached: Return cached data
    ↓
If not cached: Fetch from API
    ↓
If API fails: Return mock data
    ↓
Cache successful API response
```

## 📊 What Data You Get

### Real NFL Data Includes:
- **Current Games**: All NFL games for the current week
- **Live Odds**: Real-time spreads and totals from major sportsbooks
- **Game Times**: Actual kickoff times
- **Team Names**: Official NFL team names
- **Multiple Bookmakers**: Data from DraftKings, FanDuel, BetMGM, etc.

### Example API Response:
```json
{
  "id": "game-123",
  "home_team": "Kansas City Chiefs",
  "away_team": "Buffalo Bills",
  "commence_time": "2024-01-15T20:00:00Z",
  "bookmakers": [
    {
      "markets": [
        {
          "key": "spreads",
          "outcomes": [
            {"name": "Kansas City Chiefs", "point": -3.5},
            {"name": "Buffalo Bills", "point": 3.5}
          ]
        },
        {
          "key": "totals",
          "outcomes": [
            {"name": "Over", "point": 48.5},
            {"name": "Under", "point": 48.5}
          ]
        }
      ]
    }
  ]
}
```

## 🛠 Alternative APIs

If you want to use a different API, here are other options:

### ESPN API
```typescript
// In lib/nfl-api.ts
const response = await fetch(
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
)
```

### SportsRadar API
```typescript
// In lib/nfl-api.ts
const response = await fetch(
  `https://api.sportradar.us/nfl/official/trial/v7/en/games/2024/REG/week.json?api_key=${apiKey}`
)
```

### NFL.com API
```typescript
// In lib/nfl-api.ts
const response = await fetch(
  `https://www.nfl.com/liveupdate/scorestrip/ss.json`
)
```

## 🔍 Troubleshooting

### Common Issues:

**1. "ODDS_API_KEY not found"**
- Make sure your `.env.local` file exists
- Check that the API key is correctly set
- Restart your development server

**2. "Rate limit exceeded"**
- The free tier has 500 requests/month
- Data is cached for 5 minutes to reduce API calls
- Consider upgrading to a paid plan

**3. "API request failed: 401"**
- Your API key is invalid
- Check the key in your The Odds API dashboard

**4. "Network error"**
- Check your internet connection
- The API might be temporarily down
- App will fall back to mock data automatically

### Debug Mode:

Add this to your `.env.local` to see detailed logs:

```env
DEBUG=true
```

## 💰 API Pricing

### The Odds API Pricing:
- **Free**: 500 requests/month
- **Starter**: $10/month - 5,000 requests
- **Professional**: $50/month - 25,000 requests
- **Enterprise**: Custom pricing

### Cost Optimization:
- Data is cached for 5 minutes
- Only fetches when cache expires
- Falls back to mock data on errors
- Rate limiting prevents overuse

## 🚀 Production Deployment

### Environment Variables for Production:

```env
# Production database
DATABASE_URL="postgresql://user:password@host:port/database"

# Production API key
ODDS_API_KEY="your-production-api-key"

# Production URL
NEXTAUTH_URL="https://yourdomain.com"
```

### Deployment Platforms:
- **Vercel**: Automatic environment variable setup
- **Netlify**: Add environment variables in dashboard
- **Railway**: Set environment variables in project settings
- **DigitalOcean**: Use App Platform environment variables

## 📈 Monitoring

### Track API Usage:
1. Log into your The Odds API dashboard
2. Check the "Usage" tab
3. Monitor request count and remaining quota

### App Monitoring:
- Check browser console for API logs
- Monitor error rates in production
- Set up alerts for API failures

## 🎯 Next Steps

Once you have real data working:

1. **Add More Markets**: Player props, alternate spreads
2. **Real-time Updates**: WebSocket connections for live odds
3. **Historical Data**: Past game results and trends
4. **Multiple Sports**: NBA, MLB, NHL integration
5. **Advanced Analytics**: Betting trends and insights

## 📞 Support

- **The Odds API**: [Documentation](https://the-odds-api.com/liveapi/guides/v4/)
- **This App**: Check the GitHub issues
- **NFL Data**: [NFL.com API](https://www.nfl.com/feeds-rs/)

---

**Happy Picking! 🏈**
