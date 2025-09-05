// Client-safe utility functions that don't depend on Node.js modules

// Function to get current NFL season and week
export function getCurrentSeasonAndWeek(): { season: number; week: number } {
  const now = new Date()
  const year = now.getFullYear()
  
  // NFL season typically starts in September
  if (now.getMonth() >= 8) { // September or later
    // NFL Week 1 typically starts on the first Thursday of September
    // For 2025, let's assume Week 1 starts September 4th (Thursday)
    const seasonStart = new Date(year, 8, 4) // September 4th, 2025
    
    // Calculate days since season start
    const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24))
    
    // NFL weeks run Thursday to Wednesday
    // Calculate which week we're in (each week is 7 days)
    const week = Math.floor(daysSinceStart / 7) + 1
    
    // NFL regular season is 18 weeks
    if (week > 18) {
      return { season: year, week: 18 }
    }
    
    return { season: year, week: Math.max(1, week) }
  } else {
    // Before September, we're in the previous season
    return { season: year - 1, week: 18 }
  }
}
