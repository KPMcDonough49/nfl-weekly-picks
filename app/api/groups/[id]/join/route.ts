import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST join a group with password protection
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const body = await request.json()
    const { userId, password } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, password: true }
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if group has password protection
    if (group.password && group.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 401 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'You are already a member of this group' },
        { status: 400 }
      )
    }

    // Add user to group
    await prisma.groupMember.create({
      data: {
        userId,
        groupId
      }
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Successfully joined group', groupName: group.name }
    })
  } catch (error) {
    console.error('Error joining group:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to join group' },
      { status: 500 }
    )
  }
}
