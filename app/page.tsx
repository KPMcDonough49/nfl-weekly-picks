'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CalendarDaysIcon, UserGroupIcon, TrophyIcon } from '@heroicons/react/24/outline'

export default function Home() {
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    // Check if user is signed in (for demo purposes, check localStorage)
    // TODO: Replace with real authentication check
    const signedIn = localStorage.getItem('isSignedIn') === 'true'
    setIsSignedIn(signedIn)
  }, [])
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          NFL Picks Challenge
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Create groups, make your picks, and compete with friends to see who can predict the most NFL games correctly each week.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="card text-center">
          <CalendarDaysIcon className="h-12 w-12 text-nfl-blue mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Weekly Games</h3>
          <p className="text-gray-600">
            Pick every NFL game each week with current betting lines and spreads.
          </p>
        </div>

        <div className="card text-center">
          <UserGroupIcon className="h-12 w-12 text-nfl-blue mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Private Groups</h3>
          <p className="text-gray-600">
            Create or join groups with friends. Picks are locked until 1pm Sunday.
          </p>
        </div>

        <div className="card text-center">
          <TrophyIcon className="h-12 w-12 text-nfl-blue mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Weekly Winners</h3>
          <p className="text-gray-600">
            Track your record and see who has the best picks each week.
          </p>
        </div>
      </div>

      <div className="text-center">
        {isSignedIn ? (
          <div>
            <Link href="/dashboard" className="btn-primary mr-4">
              Go to Dashboard
            </Link>
            <Link href="/groups" className="btn-secondary">
              View Groups
            </Link>
          </div>
        ) : (
          <div>
            <Link href="/auth/signin" className="btn-primary mr-4">
              Sign In
            </Link>
            <Link href="/auth/signup" className="btn-secondary">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
