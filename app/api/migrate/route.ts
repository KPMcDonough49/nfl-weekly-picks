import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting database migration...')
    
    // Create tables using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "groups" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "password" TEXT,
        "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "group_members" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "groupId" TEXT NOT NULL,
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "groupId")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "games" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "week" INTEGER NOT NULL,
        "season" INTEGER NOT NULL,
        "homeTeam" TEXT NOT NULL,
        "awayTeam" TEXT NOT NULL,
        "homeScore" INTEGER,
        "awayScore" INTEGER,
        "spread" DOUBLE PRECISION,
        "overUnder" DOUBLE PRECISION,
        "gameTime" TIMESTAMP(3) NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'scheduled',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "picks" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "gameId" TEXT NOT NULL,
        "groupId" TEXT NOT NULL,
        "pick" TEXT NOT NULL,
        "confidence" INTEGER,
        "result" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "gameId", "groupId")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "weekly_scores" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "groupId" TEXT NOT NULL,
        "week" INTEGER NOT NULL,
        "season" INTEGER NOT NULL,
        "wins" INTEGER NOT NULL DEFAULT 0,
        "losses" INTEGER NOT NULL DEFAULT 0,
        "ties" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "groupId", "week", "season")
      )
    `
    
    console.log('✅ Database tables created successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully!'
    })
    
  } catch (error) {
    console.error('❌ Error during migration:', error)
    return NextResponse.json(
      { success: false, error: 'Migration failed' },
      { status: 500 }
    )
  }
}
