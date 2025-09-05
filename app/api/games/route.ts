import { NextRequest, NextResponse } from 'next/server'
import { fetchGamesForWeek, getCurrentSeasonAndWeek } from '@/lib/nfl-api'
import { prisma } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    const season = searchParams.get('season')

    let targetWeek: number
    let targetSeason: number

    if (week && season) {
      targetWeek = parseInt(week)
      targetSeason = parseInt(season)
    } else {
      const current = getCurrentSeasonAndWeek()
      targetWeek = current.week
      targetSeason = current.season
    }

    // First, try to get games from database
    let games = await prisma.game.findMany({
      where: {
        week: targetWeek,
        season: targetSeason
      },
      orderBy: { gameTime: 'asc' }
    })

    // Always fetch fresh data from API to ensure we have the latest games
    if (games.length === 0 || games.length < 16) {
      console.log(`No games found in database for Week ${targetWeek}, fetching from API...`)
      const apiGames = await fetchGamesForWeek(targetWeek, targetSeason)

      // Store games in database for picks to reference
      try {
        for (const game of apiGames) {
          const result = await prisma.game.upsert({
            where: { 
              id: game.id // Use the game ID directly since we removed the unique constraint
            },
            update: {
              week: targetWeek,
              season: targetSeason,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              spread: game.spread,
              overUnder: game.overUnder,
              gameTime: game.gameTime,
              status: game.status
              // Removed groupId since games are global
            },
            create: {
              id: game.id,
              week: targetWeek,
              season: targetSeason,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              spread: game.spread,
              overUnder: game.overUnder,
              gameTime: game.gameTime,
              status: game.status
              // Removed groupId since games are global
            }
          })
        }
        console.log(`Stored ${apiGames.length} games in database`)
        // Re-fetch from database to get the proper type
        games = await prisma.game.findMany({
          where: {
            week: targetWeek,
            season: targetSeason
          },
          orderBy: { gameTime: 'asc' }
        })
      } catch (error) {
        console.error('Error storing games in database:', error)
        // Re-fetch from database to get the proper type
        games = await prisma.game.findMany({
          where: {
            week: targetWeek,
            season: targetSeason
          },
          orderBy: { gameTime: 'asc' }
        })
      }
    } else {
      console.log(`Found ${games.length} games in database for Week ${targetWeek}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        week: targetWeek,
        season: targetSeason,
        games
      }
    })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
