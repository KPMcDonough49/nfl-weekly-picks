import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Update the Eagles vs Cowboys game with the correct scores
    const updatedGame = await prisma.game.update({
      where: { id: 'eagles-cowboys-2025-week1' },
      data: {
        homeScore: 34,
        awayScore: 30,
        status: 'final'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Eagles vs Cowboys game updated with scores',
      data: updatedGame
    });

  } catch (error) {
    console.error('Error updating Eagles game:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update Eagles game',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
