# 🏈 Automated Scoring System

The NFL Betting App now includes a fully automated scoring system that runs on a weekly schedule to grade picks and update leaderboards.

## 📅 Weekly Schedule

The system automatically runs at these times (Pacific Time):

- **Thursday 12:00 AM PT** - Score any early games (Thursday Night Football)
- **Sunday 2:00 PM PT** - Score games that finished before Sunday kickoffs
- **Sunday 12:00 AM PT** - Score Sunday games (after Sunday Night Football)
- **Monday 12:00 AM PT** - Score Monday night games and finalize the week

## 🚀 Setup

### 1. Install Automated Scoring
```bash
npm run setup:cron
```

This command:
- Creates the necessary cron jobs
- Sets up logging directory
- Configures the weekly schedule

### 2. Check Status
```bash
npm run check:scoring
```

This shows:
- Current cron job status
- Recent scoring activity
- Next scheduled runs
- Time until next execution

## 📊 How It Works

### Scoring Process
1. **Game Detection**: Finds all completed games with final scores
2. **Pick Grading**: Grades each pick as Correct/Incorrect/Tie/Pending
3. **Score Updates**: Updates weekly win-loss-tie records
4. **Logging**: Records all activity for monitoring

### Pick Grading Logic
- **Home/Away Picks**: Based on which team won
- **Over/Under Picks**: Based on total points vs. over/under line
- **Ties**: When scores exactly match the line
- **Pending**: When games haven't finished yet

### Example Scoring
```
Eagles vs Cowboys: Eagles win 28-21
- Home pick (Eagles) = ✅ Correct
- Away pick (Cowboys) = ❌ Incorrect  
- Over 45.5 points (49 total) = ✅ Correct
- Under 45.5 points = ❌ Incorrect
```

## 📝 Monitoring

### View Logs
```bash
tail -f logs/scoring.log
```

### Check Cron Jobs
```bash
crontab -l
```

### Manual Scoring
```bash
npm run score:picks
```

## 🔧 Management

### Remove Automated Scoring
```bash
crontab -r
```

### Reinstall Automated Scoring
```bash
npm run setup:cron
```

### View Next Runs
```bash
npm run check:scoring
```

## 📈 Features

- **Automatic Execution**: No manual intervention needed
- **Comprehensive Logging**: All activity recorded
- **Error Handling**: Graceful failure recovery
- **Phase Detection**: Knows which scoring phase it's in
- **Real-time Updates**: Leaderboards update automatically
- **Historical Tracking**: Maintains week-by-week records

## 🎯 Benefits

1. **Consistent Scoring**: Always runs on schedule
2. **Real-time Results**: Users see results as games finish
3. **Accurate Records**: No manual scoring errors
4. **Complete History**: Track performance over time
5. **Automatic Updates**: Leaderboards stay current

## 🚨 Troubleshooting

### Cron Jobs Not Running
1. Check if cron service is running: `sudo service cron status`
2. Verify cron jobs: `crontab -l`
3. Check logs: `tail -f logs/scoring.log`

### Scoring Errors
1. Check database connection
2. Verify game data is complete
3. Review error logs in `logs/scoring.log`

### Manual Override
If automated scoring fails, you can always run manually:
```bash
npm run score:picks
```

## 📋 Weekly Flow

### Thursday
- **12:00 AM PT**: Score any Thursday night games
- Users can see early results

### Sunday  
- **2:00 PM PT**: Score games before Sunday kickoffs
- **12:00 AM PT**: Score all Sunday games
- Leaderboards update throughout the day

### Monday
- **12:00 AM PT**: Score Monday night games
- Finalize the week's standings
- Prepare for next week

## 🎉 Result

Your betting app now automatically:
- ✅ Grades picks as games finish
- ✅ Updates weekly standings
- ✅ Maintains historical records
- ✅ Provides real-time leaderboards
- ✅ Runs without manual intervention

The system is fully automated and will handle the entire scoring process throughout the NFL season!
