import { prisma } from './db'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  username: string
  name: string
  createdAt: Date
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createUser(username: string, name: string, password: string): Promise<User> {
  const hashedPassword = await hashPassword(password)
  
  const user = await prisma.user.create({
    data: {
      username,
      name,
      password: hashedPassword,
      email: `${username}@example.com` // Temporary email for compatibility
    },
    select: {
      id: true,
      username: true,
      name: true,
      createdAt: true
    }
  })
  
  return user
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      password: true,
      createdAt: true
    }
  })
  
  if (!user) {
    return null
  }
  
  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    return null
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      name: true,
      createdAt: true
    }
  })
  
  return user
}
