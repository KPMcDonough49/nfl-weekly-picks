import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || '1'
    const season = searchParams.get('season') || '2025'

    // Get all picks for this group
    const picks = await prisma.pick.findMany({
      where: {
        groupId
      },
      select: {
        id: true,
        userId: true,
        gameId: true,
        pick: true,
        confidence: true,
        result: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        picks
      }
    })
  } catch (error) {
    console.error('Error fetching group picks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group picks' },
      { status: 500 }
    )
  }
}
