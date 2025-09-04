'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UserGroupIcon, LockClosedIcon, UserIcon, TrophyIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  spread: number
  overUnder: number
  gameTime: string
  status: string
  userPick?: string
}

interface Member {
  id: string
  name: string
  wins: number
  losses: number
  ties: number
  hasPicks: boolean
  pickCount: number
}

export default function GroupDetail() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  const [games, setGames] = useState<Game[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [groupName, setGroupName] = useState('')
  const [groupCreatedBy, setGroupCreatedBy] = useState('')
  const [currentWeek, setCurrentWeek] = useState(12)
  const [loading, setLoading] = useState(true)
  const [picksLocked, setPicksLocked] = useState(false)
  const [viewMode, setViewMode] = useState<'members' | 'picks' | 'summary' | 'pastWeeks'>('members')
  const [copied, setCopied] = useState(false)
  const [pastWeeksData, setPastWeeksData] = useState<any[]>([])
  const [loadingPastWeeks, setLoadingPastWeeks] = useState(false)

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

  const copyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/groups/${groupId}/join`
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }


  useEffect(() => {
    // Fetch group data
    const fetchGroupData = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`)
        const json = await res.json()
        if (json.success) {
          setGroupName(json.data.name)
          setGroupCreatedBy(json.data.createdBy)
          setCurrentWeek(json.data.currentWeek || 1)
        }
      } catch (error) {
        console.error('Error fetching group data:', error)
        // Fallback to default name
        setGroupName('Group')
        setGroupCreatedBy('demo-user')
        setCurrentWeek(1)
      }
    }

    const fetchGames = async () => {
      try {
        const res = await fetch('/api/games')
        const json = await res.json()
        if (json.success) {
          setGames(json.data.games as Game[])
        }
      } catch (e) {
        console.error('Failed to load games', e)
      }
    }

    // Fetch members with pick status
    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/members?week=${currentWeek}&season=2025`)
        const json = await res.json()
        if (json.success) {
          setMembers(json.data.members.map((member: any) => ({
            id: member.id,
            name: member.name,
            wins: member.wins || 0,
            losses: member.losses || 0,
            ties: member.ties || 0,
            hasPicks: member.hasPicks,
            pickCount: member.pickCount || 0
          })))
        }
      } catch (e) {
        console.error('Failed to load members', e)
        // Fallback to empty array instead of hardcoded data
        setMembers([])
      }
    }
    
    // Picks are now locked per individual game based on game start time
    // No global lock - each game locks when it starts
    setPicksLocked(false)

    // Fetch all data and then set loading to false
    Promise.all([
      fetchGroupData(),
      fetchGames(),
      fetchMembers()
    ]).finally(() => {
      setLoading(false)
    })

    // Fallback timeout to ensure loading is set to false
    setTimeout(() => {
      setLoading(false)
    }, 5000)
  }, [groupId])

  // Helper function to check if a specific game has started
  const isGameLocked = (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    if (!game) return false
    
    const gameStartTime = new Date(game.gameTime)
    return new Date() > gameStartTime
  }

  const handlePick = (gameId: string, pick: string) => {
    // Check if this specific game has started
    if (isGameLocked(gameId)) {
      return // Don't allow picking games that have started
    }
    
    setGames(prev => prev.map(game => 
      game.id === gameId ? { ...game, userPick: pick } : game
    ))
  }

  const handleSubmitPicks = async () => {
    // Filter out games that have already started
    const picksToSubmit = games
      .filter(game => {
        if (!game.userPick) return false
        return !isGameLocked(game.id) // Only include games that haven't started
      })
      .map(game => ({
        gameId: game.id,
        pick: game.userPick!,
        confidence: null // Could add confidence levels later
      }))

    if (picksToSubmit.length === 0) {
      alert('Please make at least one pick before submitting')
      return
    }

    try {
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'demo-user', // TODO: Replace with real user ID from auth
          groupId: groupId,
          picks: picksToSubmit
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`Successfully submitted ${picksToSubmit.length} picks!`)
        // Redirect to summary page
        router.push(`/groups/${groupId}/summary`)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error submitting picks:', error)
      alert('Failed to submit picks. Please try again.')
    }
  }

  const handleUserClick = (userId: string, hasPicks: boolean) => {
    if (userId === 'demo-user') {
      // Current user - go to picks or summary
      if (hasPicks) {
        setViewMode('summary')
      } else {
        setViewMode('picks')
      }
    } else {
      // Other user - check if picks are locked
      if (picksLocked) {
        alert('Picks are locked until after the games. You cannot view other users\' picks yet.')
      } else {
        // Navigate to other user's picks view
        router.push(`/groups/${groupId}/members/${userId}/picks`)
      }
    }
  }

  const handleBackToMembers = () => {
    setViewMode('members')
  }

  const fetchPastWeeksData = async () => {
    setLoadingPastWeeks(true)
    try {
      const response = await fetch(`/api/groups/${groupId}/past-weeks`)
      const data = await response.json()
      if (data.success) {
        setPastWeeksData(data.data.weeks)
      }
    } catch (error) {
      console.error('Error fetching past weeks data:', error)
    } finally {
      setLoadingPastWeeks(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show members view by default
  if (viewMode === 'members') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <UserGroupIcon className="h-8 w-8 text-nfl-blue mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{groupName}</h1>
          </div>
          <p className="text-gray-600">Week {currentWeek} • {members.length} members</p>
          {picksLocked && (
            <div className="mt-2 flex items-center text-orange-600">
              <LockClosedIcon className="h-5 w-5 mr-2" />
              <span className="text-sm">Picks are locked until next week</span>
            </div>
          )}
          
          {/* Invite Link Section */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Invite Friends</h3>
            <p className="text-sm text-blue-700 mb-3">
              Share this link with friends to invite them to join your group:
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/groups/${groupId}/join`}
                className="flex-1 px-3 py-2 border border-blue-200 rounded-md bg-white text-sm"
              />
              <button
                onClick={copyInviteLink}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <ClipboardIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-green-600 text-sm mt-2">Link copied to clipboard!</p>
            )}
          </div>

        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Members Section */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Group Members</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {members.map((member) => (
                <div 
                  key={member.id} 
                  className={`card cursor-pointer transition-all hover:shadow-lg ${
                    member.id === 'demo-user' ? 'ring-2 ring-nfl-blue' : ''
                  }`}
                  onClick={() => handleUserClick(member.id, member.hasPicks || false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UserIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {member.name}
                          {member.id === 'demo-user' && (
                            <span className="ml-2 text-sm text-nfl-blue font-medium">(You)</span>
                          )}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600">
                          <TrophyIcon className="h-4 w-4 mr-1" />
                          <span>{member.wins}-{member.losses}-{member.ties}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm px-2 py-1 rounded-full ${
                        member.hasPicks 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.hasPicks ? 'Picks Made' : 'No Picks'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {member.id === 'demo-user' ? 'Click to manage' : 'Click to view'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group Info Sidebar */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Group Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Week:</span>
                  <span className="font-medium">{currentWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">
                    Open (per game)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Games:</span>
                  <span className="font-medium">{games.length}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => handleUserClick('demo-user', false)}
                  className="w-full btn-primary text-sm"
                >
                  Make My Picks
                </button>
                <button 
                  onClick={() => router.push(`/groups/${groupId}/summary`)}
                  className="w-full btn-secondary text-sm"
                >
                  View Group Summary
                </button>
                <button
                  onClick={() => {
                    setViewMode('pastWeeks')
                    fetchPastWeeksData()
                  }}
                  className="w-full btn-secondary text-sm"
                >
                  Past Weeks
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show picks view
  if (viewMode === 'picks') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <UserGroupIcon className="h-8 w-8 text-nfl-blue mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{groupName}</h1>
            <button 
              onClick={handleBackToMembers}
              className="ml-4 btn-secondary text-sm"
            >
              ← Back to Members
            </button>
          </div>
          <p className="text-gray-600">Week {currentWeek} • Make Your Picks</p>
          {picksLocked && (
            <div className="mt-2 flex items-center text-orange-600">
              <LockClosedIcon className="h-5 w-5 mr-2" />
              <span className="text-sm">Picks are locked until next week</span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Games and Picks */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">This Week's Games</h2>
            <div className="space-y-4">
              {games.map((game) => (
                <div key={game.id} className="card">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-center flex-1">
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
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePick(game.id, 'away')}
                      disabled={isGameLocked(game.id)}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                        game.userPick === 'away'
                          ? 'border-nfl-blue bg-nfl-blue text-white'
                          : 'border-gray-300 hover:border-nfl-blue hover:bg-nfl-blue hover:text-white'
                      } ${isGameLocked(game.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {game.awayTeam} {formatSpread(game.spread, false)}
                    </button>
                    <button
                      onClick={() => handlePick(game.id, 'home')}
                      disabled={isGameLocked(game.id)}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                        game.userPick === 'home'
                          ? 'border-nfl-blue bg-nfl-blue text-white'
                          : 'border-gray-300 hover:border-nfl-blue hover:bg-nfl-blue hover:text-white'
                      } ${isGameLocked(game.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {game.homeTeam} {formatSpread(game.spread, true)}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmitPicks}
                disabled={games.filter(g => g.userPick && !isGameLocked(g.id)).length === 0}
                className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Picks ({games.filter(g => g.userPick && !isGameLocked(g.id)).length} available)
              </button>
            </div>
          </div>

          {/* Picks Summary Sidebar */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Your Picks Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Games:</span>
                  <span className="font-medium">{games.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Picked:</span>
                  <span className="font-medium">{games.filter(g => g.userPick).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-medium">{games.filter(g => !g.userPick).length}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Selected Picks</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {games.filter(g => g.userPick).map((game) => (
                  <div key={game.id} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-medium">
                      {game.userPick === 'away' ? game.awayTeam : game.homeTeam}
                    </div>
                    <div className="text-gray-600 text-xs">
                      vs {game.userPick === 'away' ? game.homeTeam : game.awayTeam}
                    </div>
                  </div>
                ))}
                {games.filter(g => g.userPick).length === 0 && (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No picks selected yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show summary view (redirect to summary page)
  if (viewMode === 'summary') {
    router.push(`/groups/${groupId}/summary`)
    return null
  }

  // Show past weeks view
  if (viewMode === 'pastWeeks') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <UserGroupIcon className="h-8 w-8 text-nfl-blue mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{groupName}</h1>
            <button onClick={handleBackToMembers} className="ml-4 btn-secondary text-sm">← Back to Members</button>
          </div>
          <p className="text-gray-600">Past Weeks Performance</p>
        </div>

        {loadingPastWeeks ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue"></div>
            <span className="ml-3 text-gray-600">Loading past weeks...</span>
          </div>
        ) : pastWeeksData.length === 0 ? (
          <div className="text-center py-12">
            <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Past Weeks</h3>
            <p className="text-gray-600">No weekly scores available yet. Check back after games are completed!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pastWeeksData.map((weekData) => (
              <div key={weekData.week} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Week {weekData.week}</h3>
                  {weekData.overallWinner && (
                    <div className="flex items-center text-green-600">
                      <TrophyIcon className="h-5 w-5 mr-2" />
                      <span className="font-medium">Winner: {weekData.overallWinner.name} ({weekData.overallWinner.wins}-{weekData.overallWinner.losses}-{weekData.overallWinner.ties})</span>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weekData.members.map((member: any) => (
                    <div key={member.id} className={`p-4 rounded-lg border-2 ${weekData.overallWinner && member.id === weekData.overallWinner.id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <UserIcon className="h-6 w-6 text-gray-400 mr-3" />
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {member.name}
                              {member.id === 'demo-user' && (
                                <span className="ml-2 text-sm text-nfl-blue font-medium">(You)</span>
                              )}
                            </h4>
                            <div className="flex items-center text-sm text-gray-600">
                              <TrophyIcon className="h-4 w-4 mr-1" />
                              <span>{member.wins}-{member.losses}-{member.ties}</span>
                            </div>
                          </div>
                        </div>
                        {weekData.overallWinner && member.id === weekData.overallWinner.id && (
                          <div className="text-yellow-600">
                            <TrophyIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}