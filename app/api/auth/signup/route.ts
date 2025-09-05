import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { username, name, password, confirmPassword } = await request.json()

    // Validation
    if (!username || !name || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters' },
        { status: 400 }
      )
    }

    // Create user
    const user = await createUser(username, name, password)

    return NextResponse.json({
      success: true,
      data: { user }
    })

  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
