import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('id')
    
    if (!groupId) {
      return NextResponse.json({
        success: false,
        error: 'Group ID required'
      }, { status: 400 })
    }

    console.log('Debugging group ID:', groupId)

    // Try to find the group without includes first
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({
        success: false,
        error: 'Group not found',
        groupId
      })
    }

    // Try to get members separately
    const members = await prisma.groupMember.findMany({
      where: { groupId: groupId },
      include: {
        user: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        group,
        members,
        memberCount: members.length
      }
    })

  } catch (error) {
    console.error('Error debugging group:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to debug group',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
