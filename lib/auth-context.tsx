'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from './auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<boolean>
  signUp: (username: string, name: string, password: string, confirmPassword: string) => Promise<boolean>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          // Verify token with server
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              setUser(result.data.user)
            }
          } else {
            // Invalid token, remove it
            localStorage.removeItem('auth_token')
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('auth_token')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const signIn = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const result = await response.json()

      if (result.success) {
        setUser(result.data.user)
        // Store a simple token for persistence
        localStorage.setItem('auth_token', result.data.user.id)
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return false
    }
  }

  const signUp = async (username: string, name: string, password: string, confirmPassword: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, name, password, confirmPassword }),
      })

      const result = await response.json()

      if (result.success) {
        setUser(result.data.user)
        // Store a simple token for persistence
        localStorage.setItem('auth_token', result.data.user.id)
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return false
    }
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('auth_token')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
