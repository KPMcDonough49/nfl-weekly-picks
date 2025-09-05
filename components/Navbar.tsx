'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-context'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth()

  return (
    <nav className="bg-nfl-blue shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-white text-xl font-bold">
              NFL Picks
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/dashboard" className="text-white hover:text-gray-300 px-3 py-2">
                  Dashboard
                </Link>
                <Link href="/groups" className="text-white hover:text-gray-300 px-3 py-2">
                  Groups
                </Link>
                <Link href="/leaderboard" className="text-white hover:text-gray-300 px-3 py-2">
                  Leaderboard
                </Link>
                <span className="text-white px-3 py-2">
                  Welcome, {user.name}
                </span>
                <button
                  onClick={signOut}
                  className="text-white hover:text-gray-300 px-3 py-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-white hover:text-gray-300 px-3 py-2">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="text-white hover:text-gray-300 px-3 py-2">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-gray-300"
            >
              {isOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-nfl-blue">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-white hover:text-gray-300 block px-3 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/groups"
                    className="text-white hover:text-gray-300 block px-3 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Groups
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-white hover:text-gray-300 block px-3 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Leaderboard
                  </Link>
                  <div className="text-white px-3 py-2">
                    Welcome, {user.name}
                  </div>
                  <button
                    onClick={() => {
                      signOut()
                      setIsOpen(false)
                    }}
                    className="text-white hover:text-gray-300 block px-3 py-2 w-full text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="text-white hover:text-gray-300 block px-3 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-white hover:text-gray-300 block px-3 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
