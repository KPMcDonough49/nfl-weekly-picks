import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Add the missing Eagles vs Cowboys game
    const eaglesGame = await prisma.game.create({
      data: {
        id: 'eagles-cowboys-2025-week1',
        week: 1,
        season: 2025,
        homeTeam: 'Philadelphia Eagles',
        awayTeam: 'Dallas Cowboys',
        homeScore: 34,
        awayScore: 30,
        spread: -8.5,
        overUnder: 47.5,
        gameTime: new Date('2025-09-05T21:00:00.000Z'), // Thursday night game
        status: 'final'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Eagles vs Cowboys game added successfully',
      data: eaglesGame
    });

  } catch (error) {
    console.error('Error adding Eagles game:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to add Eagles game',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
