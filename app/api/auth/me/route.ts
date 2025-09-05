import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const user = await getUserById(token)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { user }
    })

  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify authentication' },
      { status: 500 }
    )
  }
}
