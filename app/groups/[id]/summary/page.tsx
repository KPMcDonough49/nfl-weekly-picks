import { ArrowLeftIcon, LockClosedIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getCurrentSeasonAndWeek } from '@/lib/nfl-api'

interface Game {
  id: string
  homeTeam: string
  awayTeam: string
  spread: number | null
  overUnder: number | null
  gameTime: string
  status: string
  homeScore?: number | null
  awayScore?: number | null
}

interface Member {
  id: string
  name: string
  firstName: string
  lastName: string
  wins: number
  losses: number
  ties: number
  picks: any[]
}

interface PickResult {
  id: string
  gameId: string
  pick: string
  confidence: number | null
  result: 'correct' | 'incorrect' | 'tie' | 'pending'
  game: Game
}

// Helper function to grade picks
const gradePick = (pick: any, game: any): 'correct' | 'incorrect' | 'tie' | 'pending' => {
  const { pick: pickType } = pick
  const { homeScore, awayScore, spread, overUnder, status } = game

  if (status !== 'final' || !homeScore || !awayScore) {
    return 'pending'
  }

  // Calculate total points for over/under
  const totalPoints = homeScore + awayScore
  
  // Handle over/under picks
  if (pickType === 'over') {
    if (totalPoints === overUnder) return 'tie'
    return totalPoints > overUnder ? 'correct' : 'incorrect'
  } else if (pickType === 'under') {
    if (totalPoints === overUnder) return 'tie'
    return totalPoints < overUnder ? 'correct' : 'incorrect'
  }
  
  // Handle spread picks (home/away)
  // The spread represents how many points the home team is favored by
  // Negative spread = home team is favored by that many points
  // Positive spread = away team is favored by that many points
  
  const actualMargin = homeScore - awayScore
  const homeTeamSpread = Math.abs(spread || 0) // How many points home team is favored by (absolute value)
  
  if (pickType === 'home') {
    // User picked the home team
    // Home team covers if they win by MORE than the spread
    // Example: Eagles favored by 8.5, they need to win by 9+ to cover
    if (actualMargin === homeTeamSpread) return 'tie'
    return actualMargin > homeTeamSpread ? 'correct' : 'incorrect'
  } else if (pickType === 'away') {
    // User picked the away team  
    // Away team covers if they either win OR lose by less than the spread
    // Example: Eagles favored by 8.5, Cowboys cover if they lose by 8 or less
    if (actualMargin === homeTeamSpread) return 'tie'
    return actualMargin < homeTeamSpread ? 'correct' : 'incorrect'
  }

  return 'pending'
}

export default async function GroupSummaryPage({
  params
}: {
  params: { id: string }
}) {
  const groupId = params.id
  const { week: currentWeek, season: currentSeason } = getCurrentSeasonAndWeek()
  
  try {
    // Fetch data on the server side
    const [group, games, members] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          name: true,
          description: true
        }
      }),
      prisma.game.findMany({
        where: {
          // Exclude demo games - only show live NFL games
          id: {
            not: {
              in: ['test-game-1', 'test-game-2', 'test-scoring-game']
            }
          },
          week: currentWeek,
          season: currentSeason
        },
        orderBy: { gameTime: 'asc' }
      }),
      prisma.user.findMany({
        where: {
          groupMemberships: {
            some: { groupId }
          }
        },
        select: {
          id: true,
          name: true
        }
      })
    ])
    
    if (!group) {
      notFound()
    }
    
    // Individual games are locked when they start - no global lock
    const now = new Date()
    const picksLocked = false // No global lock anymore
    
    // Note: This is a server component, so we can't use useAuth here
    // The currentUserId will be determined on the client side
    const currentUserId = 'demo-user' // This will be overridden by client-side auth
    
    // Fetch all picks and weekly scores in bulk to avoid N+1 queries
    const [allPicks, allWeeklyScores] = await Promise.all([
      prisma.pick.findMany({
        where: {
          userId: { in: members.map(m => m.id) },
          groupId
        },
        select: {
          id: true,
          userId: true,
          gameId: true,
          pick: true,
          confidence: true,
          result: true
        }
      }),
      prisma.weeklyScore.findMany({
        where: {
          userId: { in: members.map(m => m.id) },
          groupId,
          week: currentWeek,
          season: currentSeason
        }
      })
    ])

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
      const picksWithResults = picks.map(pick => {
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
    
    const formatSpread = (spread: number | null, isHome: boolean) => {
      if (!spread) return 'N/A'
    if (spread > 0) {
      return isHome ? `+${spread}` : `-${spread}`
    } else {
      return isHome ? `${spread}` : `+${Math.abs(spread)}`
    }
  }


    const getResultIcon = (result: string) => {
      switch (result) {
        case 'correct':
          return <CheckCircleIcon className="h-4 w-4 text-green-500" />
        case 'incorrect':
          return <XCircleIcon className="h-4 w-4 text-red-500" />
        case 'tie':
          return <MinusCircleIcon className="h-4 w-4 text-yellow-500" />
        default:
          return <div className="h-4 w-4 rounded-full bg-gray-300" />
      }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <a 
                href={`/groups/${groupId}`}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
              </a>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
                <p className="text-gray-600">Group Summary</p>
          </div>
        </div>

            {!picksLocked && (
              <a
                href={`/groups/${groupId}/members/${currentUserId}/picks`}
                className="bg-nfl-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              Edit Picks
              </a>
            )}
          </div>

          {picksLocked && (
            <div className="flex items-center text-orange-600 mb-4">
              <LockClosedIcon className="h-5 w-5 mr-2" />
              <span className="text-sm">Picks are locked until next week</span>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Debug Info</h3>
          <div className="text-sm text-blue-800">
            <p>Group: {group.name}</p>
            <p>Games: {games.length}</p>
            <p>Members: {membersWithPicks.length}</p>
            <p>Picks Locked: {picksLocked ? 'Yes' : 'No'}</p>
            <p>Total Picks: {membersWithPicks.reduce((sum, member) => sum + member.picks.length, 0)}</p>
          </div>
      </div>

        {/* Games Header */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Games This Week ({games.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {games.map((game) => (
                <div key={game.id} className="bg-white border border-gray-200 rounded p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(game.gameTime).toLocaleDateString()} {new Date(game.gameTime).toLocaleTimeString([], { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <div className="font-semibold text-sm">
                    {game.awayTeam} @ {game.homeTeam}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {game.awayTeam} {formatSpread(game.spread, false)} • O/U: {game.overUnder || 'N/A'}
                  </div>
                </div>
              ))}
                  </div>
                </div>
              </div>

        {/* Members */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Members ({membersWithPicks.length})</h2>
          
          {membersWithPicks.map((member) => (
            <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-nfl-blue rounded-full flex items-center justify-center text-white font-semibold">
                    {member.firstName[0]}{member.lastName[0] || ''}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-lg">
                      {member.firstName} {member.lastName}
                      {member.id === currentUserId && (
                        <span className="ml-2 text-sm text-nfl-blue font-medium">(You)</span>
                      )}
                    </h3>
                    <div className="text-sm text-gray-600">
                      Record: {member.wins}-{member.losses}-{member.ties}
                    </div>
                    </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {member.picks.length} picks made
                  </div>
                  {picksLocked && member.id !== currentUserId && (
                    <div className="flex items-center text-orange-600 text-sm mt-1">
                      <LockClosedIcon className="h-4 w-4 mr-1" />
                      Locked
                    </div>
                  )}
                </div>
              </div>

              {/* Picks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {games.map((game) => {
                  // Users can only see their own picks, or other users' picks after games start
                  const gameStartTime = new Date(game.gameTime)
                  const gameHasStarted = now > gameStartTime
                  const canView = member.id === currentUserId || gameHasStarted
                  const memberPick = member.picks.find((pick: any) => pick.gameId === game.id) || null
                  
                  return (
                    <div key={game.id} className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                      <div className="text-xs text-gray-500 mb-2">
                        {game.awayTeam} @ {game.homeTeam}
                      </div>
                      
                      {canView ? (
                        memberPick ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-2">
                              <div className={`text-sm font-medium ${
                                memberPick.pick === 'home' ? 'text-blue-600' : 'text-green-600'
                              }`}>
                                {memberPick.pick === 'home' ? game.homeTeam : game.awayTeam}
                              </div>
                              {getResultIcon(memberPick.result)}
                            </div>
                            {game.status === 'final' && game.homeScore !== null && game.awayScore !== null && (
                              <div className="text-xs text-gray-500">
                                Final: {game.awayScore} - {game.homeScore}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">
                            No pick
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-center text-orange-600">
                          <LockClosedIcon className="h-5 w-5" />
                </div>
              )}
            </div>
          )
        })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading group summary:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">Failed to load group summary</p>
          <a href={`/groups/${groupId}`} className="btn-primary">
            Go Back
          </a>
      </div>
    </div>
  )
  }
}
