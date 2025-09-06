'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UserGroupIcon, LockClosedIcon, UserIcon, TrophyIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-context'
import { getCurrentSeasonAndWeek } from '@/lib/client-utils'

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  spread: number
  overUnder: number
  gameTime: string
  status: string
  homeScore?: number | null
  awayScore?: number | null
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
  const { user } = useAuth()
  const groupId = params.id as string
  const [games, setGames] = useState<Game[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [groupName, setGroupName] = useState('')
  const [groupCreatedBy, setGroupCreatedBy] = useState('')
  const [groupPassword, setGroupPassword] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState(() => {
    const { week } = getCurrentSeasonAndWeek()
    return week
  })
  const [loading, setLoading] = useState(true)
  const [picksLocked, setPicksLocked] = useState(false)
  const [viewMode, setViewMode] = useState<'members' | 'picks' | 'summary' | 'pastWeeks'>('members')
  const [copied, setCopied] = useState(false)
  const [pastWeeksData, setPastWeeksData] = useState<any[]>([])
  const [loadingPastWeeks, setLoadingPastWeeks] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [passwordPrompt, setPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinPasswordPrompt, setJoinPasswordPrompt] = useState(false)
  const [joinPasswordInput, setJoinPasswordInput] = useState('')

  // Fetch members with pick status
  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members?week=${currentWeek}&season=2025`)
      const json = await res.json()
      if (json.success) {
        const membersList = json.data.members.map((member: any) => ({
          id: member.id,
          name: member.name,
          wins: member.wins || 0,
          losses: member.losses || 0,
          ties: member.ties || 0,
          hasPicks: member.hasPicks,
          pickCount: member.pickCount || 0
        }))
        setMembers(membersList)
        
        // Check if current user is a member
        if (user) {
          const userIsMember = membersList.some((member: any) => member.id === user.id)
          setIsMember(userIsMember)
        }
      }
    } catch (e) {
      console.error('Failed to load members', e)
      // Fallback to empty array instead of hardcoded data
      setMembers([])
    }
  }

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


  // Debug useEffect to monitor state changes
  useEffect(() => {
    console.log('State changed:', { joinPasswordPrompt, groupPassword, isMember })
  }, [joinPasswordPrompt, groupPassword, isMember])

  // Debug useEffect specifically for joinPasswordPrompt
  useEffect(() => {
    console.log('joinPasswordPrompt changed to:', joinPasswordPrompt)
  }, [joinPasswordPrompt])

  useEffect(() => {
    // Fetch group data
    const fetchGroupData = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`)
        const json = await res.json()
        if (json.success) {
          setGroupName(json.data.name)
          setGroupCreatedBy(json.data.createdBy)
          setGroupPassword(json.data.password)
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
        const res = await fetch(`/api/games?week=${currentWeek}&season=2025`)
        const json = await res.json()
        if (json.success) {
          setGames(json.data.games as Game[])
        }
      } catch (e) {
        console.error('Failed to load games', e)
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
  }, [groupId, currentWeek])

  // Helper function to check if a specific game has started
  const isGameLocked = (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    if (!game) return false
    
    const gameStartTime = new Date(game.gameTime)
    return new Date() > gameStartTime
  }

  const handlePick = (gameId: string, pick: string) => {
    // Don't allow picks for locked games
    if (isGameLocked(gameId)) {
      return
    }
    
    setGames(prev => prev.map(game => {
      if (game.id === gameId) {
        // Convert 'home'/'away' to actual team names
        const teamName = pick === 'home' ? game.homeTeam : game.awayTeam
        return { ...game, userPick: teamName }
      }
      return game
    }))
  }

  const handlePasswordVerification = () => {
    if (passwordInput === groupPassword) {
      setPasswordVerified(true)
      setPasswordPrompt(false)
      setPasswordInput('')
    } else {
      alert('Incorrect password')
    }
  }

  const handleJoinGroup = () => {
    console.log('handleJoinGroup called', { user: !!user, groupPassword, joinPasswordPrompt })
    
    if (!user) {
      alert('You must be signed in to join a group')
      return
    }

    console.log('groupPassword check:', { groupPassword, type: typeof groupPassword, truthy: !!groupPassword })
    
    if (groupPassword) {
      console.log('Setting join password prompt to true')
      setJoinPasswordPrompt(true)
      console.log('After setJoinPasswordPrompt(true), joinPasswordPrompt should be true')
      
      // Test: Try setting it again with a timeout to see if it's a batching issue
      setTimeout(() => {
        console.log('Timeout test - setting joinPasswordPrompt to true again')
        setJoinPasswordPrompt(true)
      }, 100)
      
      alert('Password prompt should appear now!')
    } else {
      console.log('No password, joining directly')
      joinGroup('')
    }
  }

  const handleJoinPasswordVerification = () => {
    joinGroup(joinPasswordInput)
  }

  const joinGroup = async (password: string) => {
    if (!user) return

    setJoining(true)
    try {
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          password: password || ''
        })
      })

      const result = await response.json()

      if (result.success) {
        setIsMember(true)
        setJoinPasswordPrompt(false)
        setJoinPasswordInput('')
        // Refresh members list
        fetchMembers()
        alert(`Successfully joined ${result.data.groupName}!`)
      } else {
        alert(result.error || 'Failed to join group')
      }
    } catch (error) {
      console.error('Error joining group:', error)
      alert('Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  const handleSubmitPicks = async () => {
    if (!user) {
      alert('You must be signed in to submit picks')
      return
    }

    // Check if group is password protected and user hasn't verified
    if (groupPassword && !passwordVerified) {
      setPasswordPrompt(true)
      return
    }

    // Include all picks (both locked and unlocked games)
    const picksToSubmit = games
      .filter(game => game.userPick) // Only include games with picks
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
          userId: user?.id,
          groupId: groupId,
          picks: picksToSubmit
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`Successfully submitted ${picksToSubmit.length} picks!`)
        // Redirect to summary page
        router.push(`/groups/${groupId}/summary?userId=${user.id}`)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error submitting picks:', error)
      alert('Failed to submit picks. Please try again.')
    }
  }

  const handleUserClick = (userId: string, hasPicks: boolean) => {
    if (user && userId === user.id) {
      // Current user - always navigate to dedicated picks page
      router.push(`/groups/${groupId}/members/${userId}/picks`)
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

  // Test: Always show a simple banner to verify component is rendering
  console.log('Component rendering, joinPasswordPrompt:', joinPasswordPrompt, 'viewMode:', viewMode)
  
  let testBanner
  try {
    console.log('About to create testBanner')
    
    // Test banner that should always be visible
    testBanner = (
      <div style={{position: 'fixed', top: 0, left: 0, background: 'purple', color: 'white', padding: '10px', zIndex: 10000}}>
        TEST BANNER - joinPasswordPrompt: {joinPasswordPrompt ? 'TRUE' : 'FALSE'} - viewMode: {viewMode}
      </div>
    )
    
    console.log('testBanner created:', testBanner)
  } catch (error) {
    console.error('Error creating testBanner:', error)
    testBanner = <div>ERROR CREATING BANNER</div>
  }

  // Show members view by default
  if (viewMode === 'members') {
    console.log('About to return members view')
    try {
      return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <UserGroupIcon className="h-8 w-8 text-nfl-blue mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{groupName}</h1>
          </div>
          <p className="text-gray-600">Week {currentWeek} • {members.length} members</p>
          {!isMember && user && (
            <div className="mt-2 flex items-center text-blue-600">
              <UserGroupIcon className="h-5 w-5 mr-2" />
              <span className="text-sm">You are not a member of this group. Click "Join Group" to participate.</span>
            </div>
          )}
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
                    user && member.id === user.id ? 'ring-2 ring-nfl-blue' : ''
                  }`}
                  onClick={() => handleUserClick(member.id, member.hasPicks || false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UserIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {member.name}
                          {user && member.id === user.id && (
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
                {!isMember ? (
                  <button 
                    onClick={() => {
                      console.log('Join Group clicked', { user: !!user, joining, isMember })
                      handleJoinGroup()
                    }}
                    className="w-full btn-primary text-sm"
                    disabled={!user || joining}
                  >
                    {joining ? 'Joining...' : 'Join Group'}
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => user && router.push(`/groups/${groupId}/members/${user.id}/picks`)}
                      className="w-full btn-primary text-sm"
                      disabled={!user}
                    >
                      Make My Picks
                    </button>
                    <button 
                      onClick={() => router.push(`/groups/${groupId}/summary?userId=${user?.id || 'demo-user'}`)}
                      className="w-full btn-secondary text-sm"
                    >
                      View Group Summary
                    </button>
                  </>
                )}
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
          {groupPassword && !passwordVerified && (
            <div className="mt-2 flex items-center text-orange-600">
              <LockClosedIcon className="h-5 w-5 mr-2" />
              <span className="text-sm">Password required to make picks</span>
            </div>
          )}
        </div>

        {/* Password Prompt Modal */}
        {passwordPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Enter Group Password</h3>
              <p className="text-gray-600 mb-4">This group is password protected. Please enter the password to make picks.</p>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter group password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordVerification()}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setPasswordPrompt(false)
                    setPasswordInput('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordVerification}
                  className="btn-primary"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Debug indicator */}
        {joinPasswordPrompt && (
          <div style={{position: 'fixed', top: 0, left: 0, background: 'red', color: 'white', padding: '10px', zIndex: 10000}}>
            MODAL SHOULD BE VISIBLE - joinPasswordPrompt is true!
          </div>
        )}
        
        {/* Always visible test */}
        <div style={{position: 'fixed', top: '50px', left: 0, background: 'green', color: 'white', padding: '10px', zIndex: 10000}}>
          ALWAYS VISIBLE TEST - joinPasswordPrompt: {joinPasswordPrompt ? 'TRUE' : 'FALSE'}
          <button 
            onClick={() => {
              console.log('Direct button click - setting joinPasswordPrompt to true')
              setJoinPasswordPrompt(true)
            }}
            style={{background: 'white', color: 'black', padding: '5px', margin: '5px'}}
          >
            TEST SET STATE
          </button>
        </div>
        
        {/* Simple test - always show this when joinPasswordPrompt is true */}
        {(() => {
          console.log('JSX conditional check - joinPasswordPrompt:', joinPasswordPrompt);
          return joinPasswordPrompt && (
            <div style={{position: 'fixed', top: '100px', left: 0, background: 'blue', color: 'white', padding: '10px', zIndex: 10000}}>
              SIMPLE TEST - This should always show when joinPasswordPrompt is true
            </div>
          );
        })()}
        
        {/* Join Password Prompt Modal */}
        {(() => {
          console.log('Rendering modal check:', { joinPasswordPrompt, groupPassword });
          return null;
        })()}
        {joinPasswordPrompt && (
          <div className="fixed inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center z-50" style={{zIndex: 9999}}>
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Enter Group Password</h3>
              <p className="text-gray-600 mb-4">This group is password protected. Please enter the password to join.</p>
              <input
                type="password"
                value={joinPasswordInput}
                onChange={(e) => setJoinPasswordInput(e.target.value)}
                placeholder="Enter group password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinPasswordVerification()}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setJoinPasswordPrompt(false)
                    setJoinPasswordInput('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinPasswordVerification}
                  className="btn-primary"
                  disabled={joining}
                >
                  {joining ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                      {/* Show scores for started games */}
                      {isGameLocked(game.id) && (game.homeScore !== null || game.awayScore !== null) && (
                        <div className="text-lg font-bold text-nfl-blue mt-2">
                          Final: {game.awayTeam} {game.awayScore} - {game.homeTeam} {game.homeScore}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePick(game.id, 'away')}
                      disabled={isGameLocked(game.id)}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                        game.userPick === game.awayTeam
                          ? 'border-nfl-blue bg-nfl-blue text-white'
                          : 'border-gray-300 hover:border-nfl-blue hover:bg-nfl-blue hover:text-white'
                      } ${isGameLocked(game.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isGameLocked(game.id) ? 'LOCKED' : `${game.awayTeam} ${formatSpread(game.spread, false)}`}
                    </button>
                    <button
                      onClick={() => handlePick(game.id, 'home')}
                      disabled={isGameLocked(game.id)}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                        game.userPick === game.homeTeam
                          ? 'border-nfl-blue bg-nfl-blue text-white'
                          : 'border-gray-300 hover:border-nfl-blue hover:bg-nfl-blue hover:text-white'
                      } ${isGameLocked(game.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isGameLocked(game.id) ? 'LOCKED' : `${game.homeTeam} ${formatSpread(game.spread, true)}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmitPicks}
                disabled={games.filter(g => g.userPick).length === 0}
                className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Picks ({games.filter(g => g.userPick).length} total)
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
                      {game.userPick}
                    </div>
                    <div className="text-gray-600 text-xs">
                      vs {game.userPick === game.awayTeam ? game.homeTeam : game.awayTeam}
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
    router.push(`/groups/${groupId}/summary?userId=${user?.id || 'demo-user'}`)
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
        {testBanner}
      </div>
    )
    } catch (error) {
      console.error('Error in members view return:', error)
      return <div>ERROR IN MEMBERS VIEW: {error.message}</div>
    }
  }

  return null
}