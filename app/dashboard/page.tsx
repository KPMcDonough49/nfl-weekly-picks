'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusIcon, UserGroupIcon, TrophyIcon } from '@heroicons/react/24/outline'

interface Group {
  id: string
  name: string
  description?: string
  memberCount: number
  currentWeek: number
}

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  spread?: number
  overUnder?: number
  gameTime: string
  status: string
}

export default function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([])
  const [currentWeekGames, setCurrentWeekGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  // Helper function to format spreads correctly
  const formatSpread = (spread: number, isHome: boolean) => {
    if (spread > 0) {
      // Home team is underdog
      return isHome ? `+${spread}` : `-${spread}`
    } else {
      // Home team is favored
      return isHome ? `${spread}` : `+${Math.abs(spread)}`
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user's groups
        const groupsRes = await fetch('/api/groups')
        const groupsJson = await groupsRes.json()
        
        if (groupsJson.success) {
          // For now, show all groups since we don't have proper auth
          // TODO: Filter by user's actual group memberships once auth is implemented
          const userGroups = groupsJson.data.map((group: any) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount: group._count?.members || 0,
            currentWeek: 1 // TODO: Get actual current week
          }))
          setGroups(userGroups)
        }

        // Fetch current week games
        const gamesRes = await fetch('/api/games')
        const gamesJson = await gamesRes.json()
        if (gamesJson.success) {
          setCurrentWeekGames(gamesJson.data.games as Game[])
        }
      } catch (e) {
        console.error('Failed to load data', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <Link href="/groups/create" className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Group
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Groups Section */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Your Groups</h2>
          {groups.length === 0 ? (
            <div className="card text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
              <p className="text-gray-600 mb-4">Create or join a group to start making picks</p>
              <Link href="/groups/create" className="btn-primary">
                Create Your First Group
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.id} className="card">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      {group.description && (
                        <p className="text-gray-600 mt-1">{group.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        {group.memberCount} members • Week {group.currentWeek}
                      </p>
                    </div>
                    <Link
                      href={`/groups/${group.id}`}
                      className="btn-primary"
                    >
                      View Group
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Week Games */}
        <div>
          <h2 className="text-xl font-semibold mb-4">This Week's Games</h2>
          <div className="space-y-4">
            {currentWeekGames.map((game) => (
              <div key={game.id} className="card">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">
                    {new Date(game.gameTime).toLocaleDateString()}
                  </div>
                  <div className="font-semibold text-gray-900">
                    {game.awayTeam} @ {game.homeTeam}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Spread: {game.awayTeam} {formatSpread(game.spread || 0, false)} @ {game.homeTeam} {formatSpread(game.spread || 0, true)}
                  </div>
                  <div className="text-sm text-gray-600">
                    O/U: {game.overUnder}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
