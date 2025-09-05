'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftIcon, TrophyIcon, UserIcon } from '@heroicons/react/24/outline'

interface WeeklyScore {
  id: string
  userId: string
  groupId: string
  week: number
  season: number
  wins: number
  losses: number
  ties: number
  totalPicks: number
  winPercentage: number
  user: {
    id: string
    name: string
    email: string
  }
  group: {
    id: string
    name: string
  }
}

interface Group {
  id: string
  name: string
  description?: string
}

export default function LeaderboardPage() {
  const [scores, setScores] = useState<WeeklyScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [selectedSeason, setSelectedSeason] = useState(2025)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [loadingGroups, setLoadingGroups] = useState(true)

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    fetchWeeklyScores()
  }, [selectedWeek, selectedSeason, selectedGroup])

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true)
      const response = await fetch('/api/groups')
      const data = await response.json()
      
      if (data.success) {
        setGroups(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err)
    } finally {
      setLoadingGroups(false)
    }
  }

  const fetchWeeklyScores = async () => {
    try {
      setLoading(true)
      const url = selectedGroup === 'all' 
        ? `/api/weekly-scores?week=${selectedWeek}&season=${selectedSeason}`
        : `/api/weekly-scores?week=${selectedWeek}&season=${selectedSeason}&groupId=${selectedGroup}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setScores(data.data.scores)
      } else {
        setError(data.error || 'Failed to fetch scores')
      }
    } catch (err) {
      setError('Failed to fetch scores')
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <TrophyIcon className="h-6 w-6 text-yellow-500" />
      case 1:
        return <TrophyIcon className="h-6 w-6 text-gray-400" />
      case 2:
        return <TrophyIcon className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-gray-600">#{index + 1}</span>
    }
  }

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-50 border-yellow-200'
      case 1:
        return 'bg-gray-50 border-gray-200'
      case 2:
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-white border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchWeeklyScores}
            className="bg-nfl-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <a 
              href="/dashboard"
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </a>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
              <p className="text-gray-600">Weekly Standings</p>
            </div>
          </div>
          
          {/* Week/Season/Group Selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Group:</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                disabled={loadingGroups}
              >
                <option value="all">All Groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Week:</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                {[...Array(18)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Season:</label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Week {selectedWeek} • Season {selectedSeason}
            {selectedGroup !== 'all' && (
              <span className="text-base font-normal text-gray-600">
                {' '}• {groups.find(g => g.id === selectedGroup)?.name || 'Selected Group'}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600">
            {scores.length} players • {scores.reduce((sum, score) => sum + score.totalPicks, 0)} total picks
          </p>
        </div>

        {scores.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Scores Yet</h3>
            <p className="text-gray-600">
              No picks have been scored for this week yet. Check back after games are completed!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {scores.map((score, index) => (
              <div key={score.id} className={`px-6 py-4 ${getRankColor(index)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-nfl-blue rounded-full flex items-center justify-center text-white font-semibold">
                        {score.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <a 
                          href={`/leaderboard/user/${score.user.id}/week/${selectedWeek}?groupId=${score.group.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-nfl-blue transition-colors cursor-pointer"
                        >
                          {score.user.name}
                        </a>
                        <p className="text-sm text-gray-600">
                          {score.group.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {score.wins}-{score.losses}-{score.ties}
                    </div>
                    <div className="text-sm text-gray-600">
                      {score.winPercentage}% win rate
                    </div>
                    <div className="text-xs text-gray-500">
                      {score.totalPicks} picks
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {scores.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Performer</h3>
            <a 
              href={`/leaderboard/user/${scores[0]?.user.id}/week/${selectedWeek}?groupId=${scores[0]?.group.id}`}
              className="text-2xl font-bold text-yellow-600 hover:text-yellow-700 transition-colors cursor-pointer"
            >
              {scores[0]?.user.name}
            </a>
            <p className="text-sm text-gray-600">
              {scores[0]?.wins}-{scores[0]?.losses}-{scores[0]?.ties} record
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Picks</h3>
            <p className="text-2xl font-bold text-blue-600">
              {Math.max(...scores.map(s => s.totalPicks))}
            </p>
            <p className="text-sm text-gray-600">
              by <a 
                href={`/leaderboard/user/${scores.find(s => s.totalPicks === Math.max(...scores.map(s => s.totalPicks)))?.user.id}/week/${selectedWeek}?groupId=${scores.find(s => s.totalPicks === Math.max(...scores.map(s => s.totalPicks)))?.group.id}`}
                className="hover:text-nfl-blue transition-colors cursor-pointer"
              >
                {scores.find(s => s.totalPicks === Math.max(...scores.map(s => s.totalPicks)))?.user.name}
              </a>
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Win Rate</h3>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(scores.reduce((sum, score) => sum + score.winPercentage, 0) / scores.length)}%
            </p>
            <p className="text-sm text-gray-600">
              across all players
            </p>
          </div>
        </div>
      )}
    </div>
  )
}