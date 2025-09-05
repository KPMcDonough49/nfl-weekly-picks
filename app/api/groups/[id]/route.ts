import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id

    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    // Get members separately to handle missing users gracefully
    const members = await prisma.groupMember.findMany({
      where: { groupId: groupId },
      include: {
        user: true
      }
    })

    // Filter out members with missing users
    const validMembers = members.filter(member => member.user !== null)

    // Transform the data to match the frontend interface
    const transformedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      password: group.password, // Include password for frontend
      createdBy: group.createdBy,
      currentWeek: 1, // TODO: Calculate actual current week
      memberCount: validMembers.length,
      members: validMembers
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
