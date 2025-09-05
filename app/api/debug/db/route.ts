import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Check if users table exists and has username field
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `
    
    // Try to count users
    const userCount = await prisma.user.count()
    
    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        tableInfo,
        userCount,
        message: 'Database connection successful'
      }
    })
    
  } catch (error: any) {
    console.error('Database debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 })
  }
}
