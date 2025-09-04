import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    // Transform the data to match the frontend interface
    const transformedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      createdBy: group.createdBy,
      currentWeek: 1, // TODO: Calculate actual current week
      memberCount: group.members.length
    }

    return NextResponse.json({
      success: true,
      data: transformedGroup
    })
  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch group' },
      { status: 500 }
    )
  }
}
