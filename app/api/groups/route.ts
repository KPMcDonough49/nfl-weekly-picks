import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET all groups
export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        _count: {
          select: {
            members: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: groups
    })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}

// POST create new group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, password, createdBy = 'demo-user' } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Group name is required' },
        { status: 400 }
      )
    }

    // Create the group
    const group = await prisma.group.create({
      data: {
        name,
        description,
        password,
        createdBy
      }
    })

    // Add the creator as a member
    await prisma.groupMember.create({
      data: {
        userId: createdBy,
        groupId: group.id
      }
    })

    return NextResponse.json({
      success: true,
      data: group
    })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create group' },
      { status: 500 }
    )
  }
}

// DELETE group
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const userId = searchParams.get('userId') // User requesting deletion

    if (!groupId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing groupId or userId' },
        { status: 400 }
      )
    }

    // Check if user is the creator of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, createdBy: true, name: true }
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    if (group.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the group creator can delete the group' },
        { status: 403 }
      )
    }

    // Delete the group (cascade will handle related records)
    await prisma.group.delete({
      where: { id: groupId }
    })

    return NextResponse.json({
      success: true,
      data: { message: `Group "${group.name}" has been deleted` }
    })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete group' },
      { status: 500 }
    )
  }
}
