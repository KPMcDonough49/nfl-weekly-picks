# NFL Picks App

A web application for creating groups and competing on NFL game picks with friends. Features include weekly game picks, group management, and leaderboards with picks locked until 1pm on Sunday.

## Features

- **User Authentication**: Sign up and sign in functionality
- **Group Management**: Create and join groups with friends
- **Weekly Picks**: Pick every NFL game each week with current betting lines
- **Time Lock**: Picks are locked until 1pm on Sunday
- **Leaderboards**: Track wins/losses and see weekly winners
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: NextAuth.js
- **UI Components**: Headless UI, Heroicons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nfl-betting-picks
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── groups/            # Group management pages
│   └── globals.css        # Global styles
├── components/            # Reusable React components
├── lib/                   # Utility functions
│   ├── db.ts             # Database connection
│   └── nfl-api.ts        # NFL API integration
├── prisma/               # Database schema
└── public/               # Static assets
```

## API Integration

The app is set up to use **The Odds API** for real NFL data. Here's how to get it working:

### 1. Get Your Free API Key

1. Go to [The Odds API](https://the-odds-api.com/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier includes 500 requests/month

### 2. Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# The Odds API
ODDS_API_KEY="your-odds-api-key-here"
```

### 3. How It Works

- The app automatically tries to fetch real NFL data from The Odds API
- If the API key is missing or there's an error, it falls back to mock data
- Real data includes current betting lines, spreads, and totals from major sportsbooks
- Data updates in real-time as odds change

### 4. Alternative APIs

You can also integrate with:
- **ESPN API**: For game schedules and scores
- **SportsRadar API**: For comprehensive NFL data
- **NFL.com API**: For official game data

Just update the `fetchGamesForWeek` function in `lib/nfl-api.ts` to use your preferred API.

## Database Schema

- **Users**: User accounts and authentication
- **Groups**: Pick groups with members
- **Games**: NFL games with betting lines
- **Picks**: User picks for each game
- **WeeklyScores**: Weekly win/loss records

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [ ] Real NFL API integration
- [ ] Push notifications for game updates
- [ ] Mobile app (React Native)
- [ ] Advanced statistics and analytics
- [ ] Custom scoring systems
- [ ] Tournament brackets
- [ ] Social features (comments, reactions)
# nfl-weekly-picks
# Trigger deployment
