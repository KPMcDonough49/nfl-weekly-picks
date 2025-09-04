// Utility functions for API management and caching

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry>()

// Cache duration: 7 days for odds data (fetched once per week on Wednesday)
const ODDS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000

export function getCachedData(key: string): any | null {
  const entry = cache.get(key)
  
  if (!entry) {
    return null
  }
  
  const now = Date.now()
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key)
    return null
  }
  
  return entry.data
}

// Check for cached file data
export function getCachedFileData(): any | null {
  try {
    const fs = require('fs')
    const path = require('path')
    const cacheFile = path.join(process.cwd(), '.cache', 'nfl-games-cache.json')
    
    if (!fs.existsSync(cacheFile)) {
      return null
    }
    
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    const fetchedAt = new Date(data.fetchedAt)
    const now = new Date()
    
    // Check if cache is less than 7 days old
    if (now.getTime() - fetchedAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return data.games
    }
    
    return null
  } catch (error) {
    console.error('Error reading cache file:', error)
    return null
  }
}

export function setCachedData(key: string, data: any, ttl: number = ODDS_CACHE_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

export function generateCacheKey(week: number, season: number): string {
  return `nfl-games-${season}-${week}`
}

// Check if it's Wednesday (when we should fetch new lines)
export function isWednesday(): boolean {
  const now = new Date()
  return now.getDay() === 3 // 3 = Wednesday
}

// Get the Wednesday of the current week
export function getWednesdayOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay()
  const daysToWednesday = (3 - dayOfWeek + 7) % 7 // 3 = Wednesday
  
  const wednesday = new Date(date)
  wednesday.setDate(date.getDate() + daysToWednesday)
  wednesday.setHours(12, 0, 0, 0) // Noon on Wednesday
  
  return wednesday
}

// Rate limiting helper
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(apiKey: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = `rate-limit-${apiKey}`
  
  const current = requestCounts.get(key)
  
  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}

// API error handling
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function handleAPIError(error: any): never {
  if (error instanceof APIError) {
    throw error
  }
  
  if (error.response) {
    // HTTP error response
    throw new APIError(
      `API request failed: ${error.response.status} ${error.response.statusText}`,
      error.response.status
    )
  } else if (error.request) {
    // Network error
    throw new APIError('Network error: Unable to reach API')
  } else {
    // Other error
    throw new APIError(`API error: ${error.message}`)
  }
}
