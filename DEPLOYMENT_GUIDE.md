# 🚀 Production Deployment Guide

## **Vercel Deployment (Recommended)**

### **Step 1: Prepare Your App**

1. **Database Migration**: Your app is already configured for PostgreSQL
2. **Environment Variables**: Set up in Vercel dashboard
3. **Build Scripts**: Already configured in package.json

### **Step 2: Deploy to Vercel**

#### **Option A: Vercel CLI (Fastest)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: nfl-betting-app
# - Directory: ./
# - Override settings? No
```

#### **Option B: GitHub Integration (Recommended)**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables
6. Deploy!

### **Step 3: Environment Variables**

In Vercel dashboard, add these environment variables:

```
DATABASE_URL=postgresql://username:password@host:port/database
ODDS_API_KEY=your_odds_api_key_here
NEXTAUTH_SECRET=your_random_secret_here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### **Step 4: Database Setup**

#### **Option A: Vercel Postgres (Easiest)**
1. In Vercel dashboard, go to Storage tab
2. Create a new Postgres database
3. Copy the connection string to DATABASE_URL
4. Run migrations: `vercel env pull` then `npx prisma db push`

#### **Option B: External Database**
- **Neon** (Free tier): https://neon.tech
- **PlanetScale** (Free tier): https://planetscale.com
- **Supabase** (Free tier): https://supabase.com

### **Step 5: Automated Deployments**

Once connected to GitHub:
- Every push to `main` branch = automatic deployment
- Preview deployments for pull requests
- Custom domains available

## **Alternative Hosting Options**

### **Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### **Netlify**
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add environment variables in dashboard

## **Production Checklist**

### **Before Deploying:**
- [ ] Update `prisma/schema.prisma` for PostgreSQL
- [ ] Set up environment variables
- [ ] Test build locally: `npm run build`
- [ ] Set up database and run migrations
- [ ] Configure domain (optional)

### **After Deploying:**
- [ ] Test all functionality
- [ ] Set up automated NFL line fetching (GitHub Actions)
- [ ] Monitor performance and errors
- [ ] Set up analytics (optional)

## **Automated NFL Line Fetching**

### **GitHub Actions (Free)**
Create `.github/workflows/fetch-lines.yml`:

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
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## **Cost Breakdown**

### **Vercel (Free Tier)**
- Hosting: Free
- Database: Free (Vercel Postgres)
- Bandwidth: 100GB/month free
- **Total: $0/month**

### **With External Database**
- Hosting: Free (Vercel)
- Database: Free (Neon/PlanetScale/Supabase)
- **Total: $0/month**

## **Performance Tips**

1. **Enable Vercel Analytics** (free)
2. **Use Vercel Edge Functions** for API routes
3. **Optimize images** with Next.js Image component
4. **Enable caching** for static assets
5. **Monitor Core Web Vitals**

## **Security Considerations**

1. **Environment Variables**: Never commit secrets
2. **API Keys**: Use Vercel's secret management
3. **Database**: Use connection pooling
4. **HTTPS**: Automatically enabled on Vercel
5. **Rate Limiting**: Already implemented in your app

---

**Your app is production-ready! 🎉**
