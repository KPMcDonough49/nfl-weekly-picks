# 🏈 Wednesday Caching System

Your NFL Picks app now uses a smart caching system that fetches lines once per week on Wednesday to minimize API usage and stay within free tier limits.

## 🎯 **How It Works**

### **Wednesday Fetch Strategy:**
- **Wednesday**: Fetches fresh NFL lines from The Odds API
- **Thursday-Monday**: Uses cached data (no API calls)
- **Tuesday**: Uses cached data (no API calls)
- **Next Wednesday**: Fetches fresh lines again

### **Cache Duration:**
- **7 days** (instead of 5 minutes)
- **File-based cache** persists between server restarts
- **In-memory cache** for faster access during the same session

## 📊 **API Usage Optimization**

### **Before (Every Request):**
- Every page visit = 1 API call
- 100 page visits = 100 API calls
- Could hit 500/month limit quickly

### **After (Wednesday Only):**
- Wednesday = 1 API call per week
- 100 page visits = 0 additional API calls
- Uses only ~4 API calls per month

## 🛠 **Manual Commands**

### **Fetch Lines Manually:**
```bash
npm run fetch:lines
```

### **Test API Connection:**
```bash
npm run test:api
```

## 📅 **Automated Setup (Optional)**

### **Cron Job (Linux/Mac):**
```bash
# Add to crontab to run every Wednesday at 12pm
0 12 * * 3 cd /path/to/your/app && npm run fetch:lines
```

### **Windows Task Scheduler:**
- Create a task to run `npm run fetch:lines` every Wednesday at 12pm

### **GitHub Actions (Free):**
```yaml
name: Fetch NFL Lines
on:
  schedule:
    - cron: '0 12 * * 3'  # Every Wednesday at 12pm UTC
  workflow_dispatch:  # Manual trigger

jobs:
  fetch-lines:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run fetch:lines
        env:
          ODDS_API_KEY: ${{ secrets.ODDS_API_KEY }}
```

## 🔍 **Cache Files**

### **Location:**
```
.cache/nfl-games-cache.json
```

### **Structure:**
```json
{
  "games": [...],
  "fetchedAt": "2024-01-15T12:00:00.000Z",
  "weekStart": "2024-01-18",
  "weekEnd": "2024-01-22"
}
```

## 🚨 **Troubleshooting**

### **Cache Not Working:**
1. Check if `.cache/nfl-games-cache.json` exists
2. Verify the file is less than 7 days old
3. Run `npm run fetch:lines` to refresh

### **API Limit Hit:**
1. Check your usage at [The Odds API Dashboard](https://the-odds-api.com/account/)
2. Wait until next month or upgrade plan
3. App will fall back to mock data automatically

### **Wednesday Fetch Failed:**
1. Check your internet connection
2. Verify API key is correct
3. Check API status at [The Odds API](https://the-odds-api.com/)

## 📈 **Benefits**

- ✅ **99% reduction** in API calls
- ✅ **Faster page loads** (cached data)
- ✅ **Reliable service** (works offline)
- ✅ **Cost effective** (stays in free tier)
- ✅ **Professional setup** (industry standard)

## 🎯 **Next Steps**

1. **Set up automation** (cron job or GitHub Actions)
2. **Monitor usage** in The Odds API dashboard
3. **Consider upgrading** if you need more features
4. **Add more sports** (NBA, MLB, NHL) with same pattern

---

**Your app now uses professional-grade caching to minimize API costs while providing fast, reliable service!** 🚀
