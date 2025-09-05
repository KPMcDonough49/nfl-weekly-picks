import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    // Update the Eagles vs Cowboys game time to be in the past
    const updatedGame = await prisma.game.update({
      where: { id: 'eagles-cowboys-2025-week1' },
      data: {
        gameTime: new Date('2025-09-05T18:00:00.000Z'), // 6 PM UTC (11 AM PDT) - in the past
        status: 'final',
        homeScore: 24,
        awayScore: 20
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Eagles vs Cowboys game time fixed',
      data: updatedGame
    });
  } catch (error) {
    console.error('Error fixing Eagles game time:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fix game time' },
      { status: 500 }
    );
  }
}
