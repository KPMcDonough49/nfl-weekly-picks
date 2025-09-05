'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UserGroupIcon, UserIcon, ArrowLeftIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-context'

interface Game {
  homeTeam: string
  awayTeam: string
  spread: number
  overUnder: number
  gameTime: string
  status: string
}

interface Pick {
  id: string
  gameId: string
  pick: string
  confidence: number | null
  createdAt: string
  updatedAt: string
  game: Game | null
}

interface User {
  id: string
  name: string
  email: string
}

export default function UserPicksPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const groupId = params.id as string
  const userId = params.userId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [picks, setPicks] = useState<Pick[]>([])
  const [games, setGames] = useState<any[]>([])
  const [picksLocked, setPicksLocked] = useState(false)
  const [week, setWeek] = useState(1)
  const [season, setSeason] = useState(2025)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingPicks, setPendingPicks] = useState<{[gameId: string]: string}>({})
  const [hasChanges, setHasChanges] = useState(false)
  
  // Check if current user can edit these picks
  const canEdit = currentUser && userId === currentUser.id

  // Helper function to format spreads correctly
  const formatSpread = (spread: number, isHome: boolean) => {
    if (spread > 0) {
      // Home team is underdog (positive spread)
      return isHome ? `+${spread}` : `-${spread}`
    } else if (spread < 0) {
      // Home team is favored (negative spread)
      return isHome ? `${spread}` : `+${Math.abs(spread)}`
    } else {
      // Even spread (pick'em)
      return 'PK'
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch picks and games data
        const [picksRes, gamesRes] = await Promise.all([
          fetch(`/api/groups/${groupId}/members/${userId}/picks?week=${week}&season=${season}`),
          fetch('/api/games')
        ])
        
        const picksJson = await picksRes.json()
        const gamesJson = await gamesRes.json()
        
        if (picksJson.success && gamesJson.success) {
          setUser(picksJson.data.user)
          setPicks(picksJson.data.picks)
          setPicksLocked(picksJson.data.picksLocked)
          setWeek(picksJson.data.week)
          setSeason(picksJson.data.season)
          setGames(gamesJson.data.games)
        } else {
          alert('Failed to load data')
          router.back()
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        alert('Failed to load data')
        router.back()
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [groupId, userId, router])

  const handleBackToGroup = () => {
    router.push(`/groups/${groupId}`)
  }

  const handleMakePick = (gameId: string, pick: string) => {
    if (!canEdit) {
      alert('You can only edit your own picks!')
      return
    }
    
    if (picksLocked) {
      alert('Picks are locked!')
      return
    }

    // Update pending picks
    setPendingPicks(prev => ({
      ...prev,
      [gameId]: pick
    }))
    setHasChanges(true)
  }

  const handleSaveChanges = async () => {
    if (!canEdit) {
      alert('You can only edit your own picks!')
      return
    }
    
    if (!hasChanges) return

    setSaving(true)
    try {
      // Convert pending picks to the format expected by the API
      const picksToSave = Object.entries(pendingPicks).map(([gameId, pick]) => ({
        gameId,
        pick,
        confidence: 3 // Default confidence
      }))

      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          groupId,
          picks: picksToSave
        }),
      })

      const json = await res.json()
      
      if (json.success) {
        // Update local picks state with the new picks
        const updatedPicks = [...picks]
        
        Object.entries(pendingPicks).forEach(([gameId, pick]) => {
          const existingPickIndex = updatedPicks.findIndex(p => p.gameId === gameId)
          if (existingPickIndex >= 0) {
            // Update existing pick
            updatedPicks[existingPickIndex] = {
              ...updatedPicks[existingPickIndex],
              pick,
              updatedAt: new Date().toISOString()
            }
          } else {
            // Add new pick
            const newPick = {
              id: `temp-${Date.now()}`,
              gameId,
              pick,
              confidence: 3,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              game: games.find(g => g.id === gameId)
            }
            updatedPicks.push(newPick)
          }
        })
        
        setPicks(updatedPicks)
        setPendingPicks({})
        setHasChanges(false)
        alert('Picks saved successfully!')
      } else {
        alert('Failed to save picks: ' + (json.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving picks:', error)
      alert('Failed to save picks')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <button onClick={handleBackToGroup} className="btn-secondary">
            ← Back to Group
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <button 
            onClick={handleBackToGroup}
            className="mr-4 btn-secondary"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Group
          </button>
          <UserGroupIcon className="h-8 w-8 text-nfl-blue mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">
            {canEdit ? 'Your Picks' : `${user.name}'s Picks`}
          </h1>
        </div>
        <p className="text-gray-600">Week {week} • Season {season} • {picks.length} picks made</p>
        
        {picksLocked && (
          <div className="mt-2 flex items-center text-orange-600">
            <LockClosedIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">Picks are locked until next week</span>
          </div>
        )}
        
        {/* Save Changes Button */}
        {canEdit && hasChanges && !picksLocked && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
        
        {/* View Only Notice */}
        {!canEdit && (
          <div className="mt-4 flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-blue-800 text-sm">
              <LockClosedIcon className="h-4 w-4 inline mr-2" />
              You can only view this user's picks after each game starts
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Games and Picks Section */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {canEdit ? 'Make Your Picks' : 'View Picks'}
            </h2>
            {picksLocked && (
              <div className="flex items-center text-orange-600">
                <LockClosedIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">Picks are locked</span>
              </div>
            )}
            {!canEdit && (
              <div className="flex items-center text-blue-600">
                <LockClosedIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">View only</span>
              </div>
            )}
          </div>
          
          {games.length === 0 ? (
            <div className="card text-center py-12">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No games available</h3>
              <p className="text-gray-600">Games will appear here when they become available.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {games.map((game) => {
                const savedPick = picks.find(p => p.gameId === game.id)
                const pendingPick = pendingPicks[game.id]
                const currentPick = pendingPick || savedPick?.pick
                
                // Check if game has started - users can only see other users' picks after game starts
                const gameStartTime = new Date(game.gameTime)
                const gameHasStarted = new Date() > gameStartTime
                const canViewPick = canEdit || gameHasStarted
                
                return (
                  <div key={game.id} className="card">
                    <div className="text-center mb-4">
                      <div className="text-sm text-gray-600 mb-1">
                        {new Date(game.gameTime).toLocaleDateString()} at{' '}
                        {new Date(game.gameTime).toLocaleTimeString([], { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {game.awayTeam} @ {game.homeTeam}
                      </div>
                      <div className="text-sm text-gray-600">
                        Spread: {game.awayTeam} {formatSpread(game.spread, false)} | {game.homeTeam} {formatSpread(game.spread, true)}
                      </div>
                      <div className="text-sm text-gray-600">
                        O/U: {game.overUnder}
                      </div>
                    </div>

                    {/* Pick Display/Buttons */}
                    {canViewPick ? (
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => handleMakePick(game.id, 'away')}
                          disabled={!canEdit || picksLocked}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            currentPick === 'away'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : canEdit && !picksLocked
                              ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          } ${(!canEdit || picksLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {game.awayTeam} {formatSpread(game.spread, false)}
                        </button>
                        <button
                          onClick={() => handleMakePick(game.id, 'home')}
                          disabled={!canEdit || picksLocked}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            currentPick === 'home'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : canEdit && !picksLocked
                              ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          } ${(!canEdit || picksLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {game.homeTeam} {formatSpread(game.spread, true)}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center py-4">
                        <div className="flex items-center text-orange-600">
                          <LockClosedIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">Pick hidden until game starts</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* User Info Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">User Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="text-gray-600">{user.email}</div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Picks Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Picks:</span>
                <span className="font-medium">{picks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Week:</span>
                <span className="font-medium">{week}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Season:</span>
                <span className="font-medium">{season}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${picksLocked ? 'text-orange-600' : 'text-green-600'}`}>
                  {picksLocked ? 'Locked' : 'Open'}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={handleBackToGroup}
                className="w-full btn-secondary text-sm"
              >
                Back to Group
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
