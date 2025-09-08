import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET picks for a user in a group
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const groupId = searchParams.get('groupId')

    if (!userId || !groupId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or groupId' },
        { status: 400 }
      )
    }

    const picks = await prisma.pick.findMany({
      where: {
        userId,
        groupId
      }
    })

    return NextResponse.json({
      success: true,
      data: picks
    })
  } catch (error) {
    console.error('Error fetching picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch picks' },
      { status: 500 }
    )
  }
}

// POST new picks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, groupId, picks } = body

    if (!userId || !groupId || !picks || !Array.isArray(picks)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if individual games have started - no global lock
    const now = new Date()
    
    // Get game information to check start times
    const gameIds = picks.map((pick: any) => pick.gameId)
    const games = await prisma.game.findMany({
      where: { id: { in: gameIds } },
      select: { id: true, gameTime: true }
    })
    
    // Check if any picks are for games that have already started
    const lockedPicks = picks.filter((pick: any) => {
      const game = games.find(g => g.id === pick.gameId)
      if (!game) return false
      const gameStartTime = new Date(game.gameTime)
      return new Date() > gameStartTime
    })
    
    // Block picks for games that have already started
    if (lockedPicks.length > 0) {
      const lockedGameIds = lockedPicks.map(p => p.gameId)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot make picks for games that have already started',
          lockedGames: lockedGameIds
        },
        { status: 400 }
      )
    }

    // Verify that all gameIds exist in the database (games are global, not tied to groups)
    const existingGames = await prisma.game.findMany({
      where: {
        id: { in: gameIds }
        // Removed groupId constraint since games are global
      },
      select: { id: true }
    })

    if (existingGames.length !== gameIds.length) {
      const existingGameIds = existingGames.map(g => g.id)
      const missingGameIds = gameIds.filter(id => !existingGameIds.includes(id))
      console.error('Missing games in database:', missingGameIds)
      return NextResponse.json(
        { success: false, error: 'Some games not found in database' },
        { status: 400 }
      )
    }

    // Handle incremental updates - only update/create the specific picks sent
    let totalUpdated = 0
    
    for (const pick of picks) {
      // Check if pick already exists
      const existingPick = await prisma.pick.findFirst({
        where: {
          userId,
          gameId: pick.gameId,
          groupId
        }
      })

      if (existingPick) {
        // Update existing pick
        await prisma.pick.update({
          where: { id: existingPick.id },
          data: {
            pick: pick.pick,
            confidence: pick.confidence || null,
            updatedAt: new Date()
          }
        })
      } else {
        // Create new pick
        await prisma.pick.create({
          data: {
            userId,
            groupId,
            gameId: pick.gameId,
            pick: pick.pick,
            confidence: pick.confidence || null
          }
        })
      }
      totalUpdated++
    }

    return NextResponse.json({
      success: true,
      data: { count: totalUpdated }
    })
  } catch (error) {
    console.error('Error saving picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save picks' },
      { status: 500 }
    )
  }
}
