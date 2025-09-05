'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, LockClosedIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline'
import { getCurrentSeasonAndWeek } from '@/lib/client-utils'

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  spread: number | null
  overUnder: number | null
  gameTime: string | Date
  status: string
  homeScore?: number | null
  awayScore?: number | null
}

interface Member {
  id: string
  name: string
}

interface Pick {
  id: string
  gameId: string
  pick: string
  confidence: number | null
  result: string | null
}

// Helper function to grade picks (same logic as in score-picks.js)
const gradePick = (pick: Pick, game: Game): string => {
  if (game.status !== 'final' || game.homeScore === null || game.homeScore === undefined || game.awayScore === null || game.awayScore === undefined) {
    return 'pending'
  }

  const homeScore = game.homeScore
  const awayScore = game.awayScore
  const spread = game.spread || 0

  // Calculate the actual spread result
  const actualSpread = homeScore - awayScore

  if (pick.pick === game.homeTeam) {
    // User picked home team
    if (actualSpread > spread) {
      return 'correct' // Home team won by more than the spread
    } else if (actualSpread < spread) {
      return 'incorrect' // Home team won by less than the spread (or lost)
    } else {
      return 'tie' // Home team won by exactly the spread
    }
  } else if (pick.pick === game.awayTeam) {
    // User picked away team
    if (actualSpread < spread) {
      return 'correct' // Away team covered (home team didn't beat the spread)
    } else if (actualSpread > spread) {
      return 'incorrect' // Away team didn't cover (home team beat the spread)
    } else {
      return 'tie' // Exactly the spread
    }
  }

  return 'pending'
}

export default function GroupSummaryPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  const { week: currentWeek, season: currentSeason } = getCurrentSeasonAndWeek()
  
  const [group, setGroup] = useState<{ id: string; name: string; description: string | null } | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [allPicks, setAllPicks] = useState<any[]>([])
  const [allWeeklyScores, setAllWeeklyScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [picksLocked, setPicksLocked] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('demo-user')
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get userId from URL search params
        const urlParams = new URLSearchParams(window.location.search)
        const userId = urlParams.get('userId')
        if (userId) {
          setCurrentUserId(userId)
        }
        
        // Fetch group data
        const groupRes = await fetch(`/api/groups/${groupId}`)
        const groupData = await groupRes.json()
        
        if (groupData.success) {
          setGroup(groupData.data)
        }
        
        // Fetch games data
        const gamesRes = await fetch('/api/games')
        const gamesData = await gamesRes.json()
        
        if (gamesData.success) {
          setGames(gamesData.data.games)
        }
        
        // Fetch members data
        const membersRes = await fetch(`/api/groups/${groupId}/members?week=${currentWeek}&season=${currentSeason}`)
        const membersData = await membersRes.json()
        
        if (membersData.success) {
          setMembers(membersData.data.members)
        }
        
        // Fetch picks data for all members
        const picksRes = await fetch(`/api/groups/${groupId}/picks?week=${currentWeek}&season=${currentSeason}`)
        const picksData = await picksRes.json()
        
        if (picksData.success) {
          setAllPicks(picksData.data.picks || [])
        }
        
        // Fetch weekly scores data
        const scoresRes = await fetch(`/api/groups/${groupId}/weekly-scores?week=${currentWeek}&season=${currentSeason}`)
        const scoresData = await scoresRes.json()
        
        if (scoresData.success) {
          setAllWeeklyScores(scoresData.data.scores || [])
        }
        
        setPicksLocked(false) // No global lock anymore
      } catch (error) {
        console.error('Error fetching summary data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (groupId) {
      fetchData()
    }
  }, [groupId, currentWeek, currentSeason])
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }
  
  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Group not found</div>
      </div>
    )
  }
    
  // Group picks and scores by user ID
  const picksByUser = allPicks.reduce((acc, pick) => {
    if (!acc[pick.userId]) acc[pick.userId] = []
    acc[pick.userId].push(pick)
    return acc
  }, {} as Record<string, any[]>)

  const scoresByUser = allWeeklyScores.reduce((acc, score) => {
    acc[score.userId] = score
    return acc
  }, {} as Record<string, any>)

  // Process each member
  const membersWithPicks = members.map(member => {
    const picks = picksByUser[member.id] || []
    const weeklyScore = scoresByUser[member.id]

    // Grade each pick
    const picksWithResults = picks.map((pick: any) => {
      const game = games.find(g => g.id === pick.gameId)
      if (!game) return null

      // Use the stored result from the database, or calculate if not available
      const result = pick.result || gradePick(pick, game)
      return {
        id: pick.id,
        gameId: pick.gameId,
        pick: pick.pick,
        confidence: pick.confidence,
        result: result,
        game: game
      }
    }).filter(Boolean)

    return {
      id: member.id,
      name: member.name,
      firstName: member.name.split(' ')[0] || member.name,
      lastName: member.name.split(' ').slice(1).join(' ') || '',
      wins: weeklyScore?.wins || 0,
      losses: weeklyScore?.losses || 0,
      ties: weeklyScore?.ties || 0,
      picks: picksWithResults
    }
  })

  // Create picks with results for display
  const picksWithResults = games.map(game => {
    const gamePicks = membersWithPicks.map(member => {
      const pick = member.picks.find((p: any) => p && p.gameId === game.id)
      return {
        memberId: member.id,
        memberName: member.name,
        pick: pick?.pick || null,
        confidence: pick?.confidence || null,
        result: pick?.result || (pick ? gradePick(pick, game) : null)
      }
    })
    
    return {
      ...game,
      picks: gamePicks
    }
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <ArrowLeftIcon className="h-8 w-8 text-nfl-blue mr-3 cursor-pointer" onClick={() => router.back()} />
          <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
        </div>
        <p className="text-gray-600">Week {currentWeek} • Group Summary</p>
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
              {picksWithResults.map((game) => (
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
                        Spread: {game.awayTeam} {game.spread && game.spread > 0 ? `+${game.spread}` : game.spread} | {game.homeTeam} {game.spread && game.spread < 0 ? game.spread : (game.spread ? `+${Math.abs(game.spread)}` : 'PK')}
                      </div>
                      <div className="text-sm text-gray-600">
                        O/U: {game.overUnder}
                      </div>
                      {game.status === 'final' && game.homeScore !== null && game.awayScore !== null && (
                        <div className="text-lg font-bold text-nfl-blue mt-2">
                          Final: {game.awayTeam} {game.awayScore} - {game.homeTeam} {game.homeScore}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Picks for this game */}
                  <div className="space-y-2">
                    {game.picks.map((pick) => (
                      <div key={pick.memberId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <span className="font-medium text-sm w-20 truncate">
                            {pick.memberName}
                          </span>
                          {pick.pick && (
                            <span className="text-sm text-gray-600 ml-2">
                              {pick.pick}
                              {pick.confidence && (
                                <span className="ml-1 text-xs text-gray-500">
                                  ({pick.confidence})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          {pick.pick && pick.result && (
                            <>
                              {pick.result === 'correct' && (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              )}
                              {pick.result === 'incorrect' && (
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                              )}
                              {pick.result === 'tie' && (
                                <MinusCircleIcon className="h-5 w-5 text-yellow-500" />
                              )}
                              {pick.result === 'pending' && (
                                <div className="h-5 w-5 rounded-full bg-gray-300" />
                              )}
                            </>
                          )}
                          {pick.memberId === currentUserId && (
                            <span className="ml-2 text-xs text-nfl-blue font-medium">(You)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Members Summary */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Group Members</h2>
            <div className="space-y-3">
              {membersWithPicks.map((member) => (
                <div 
                  key={member.id} 
                  className={`card ${member.id === currentUserId ? 'ring-2 ring-nfl-blue' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {member.name}
                        {member.id === currentUserId && (
                          <span className="ml-2 text-sm text-nfl-blue font-medium">(You)</span>
                        )}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {member.wins}-{member.losses}-{member.ties}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {member.picks.length} picks
                      </div>
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
