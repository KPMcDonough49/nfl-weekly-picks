import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const user = await authenticateUser(username, password)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { user }
    })

  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sign in' },
      { status: 500 }
    )
  }
}
