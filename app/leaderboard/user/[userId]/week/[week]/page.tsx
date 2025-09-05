import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline'
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

interface User {
  id: string
  name: string
}

interface Pick {
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

  const homeTeamWon = homeScore > awayScore
  const awayTeamWon = awayScore > homeScore
  const tied = homeScore === awayScore

  // Calculate total points
  const totalPoints = homeScore + awayScore
  const overUnderResult = totalPoints > overUnder ? 'over' : 'under'

  // Grade the pick
  if (pickType === 'home') {
    if (tied) return 'tie'
    return homeTeamWon ? 'correct' : 'incorrect'
  } else if (pickType === 'away') {
    if (tied) return 'tie'
    return awayTeamWon ? 'correct' : 'incorrect'
  } else if (pickType === 'over') {
    if (totalPoints === overUnder) return 'tie'
    return overUnderResult === 'over' ? 'correct' : 'incorrect'
  } else if (pickType === 'under') {
    if (totalPoints === overUnder) return 'tie'
    return overUnderResult === 'under' ? 'correct' : 'incorrect'
  }

  return 'pending'
}

export default async function UserPicksPage({
  params,
  searchParams
}: {
  params: { userId: string; week: string }
  searchParams: { groupId?: string }
}) {
  const userId = params.userId
  const week = parseInt(params.week)
  const groupId = searchParams.groupId
  const { season: currentSeason } = getCurrentSeasonAndWeek()
  
  try {
    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    })
    
    if (!user) {
      notFound()
    }
    
    // Fetch games for the specified week
    const games = await prisma.game.findMany({
      where: {
        week: week,
        season: currentSeason,
        // Exclude demo games
        id: {
          not: {
            in: ['test-game-1', 'test-game-2', 'test-scoring-game']
          }
        }
      },
      orderBy: { gameTime: 'asc' }
    })
    
    // Fetch user's picks for this week and group
    const picks = await prisma.pick.findMany({
      where: {
        userId: userId,
        gameId: { in: games.map(g => g.id) },
        ...(groupId && { groupId: groupId })
      }
    })
    
    // Get weekly score for this user, week, and group
    const weeklyScore = await prisma.weeklyScore.findFirst({
      where: {
        userId: userId,
        week: week,
        season: currentSeason,
        ...(groupId && { groupId: groupId })
      }
    })
    
    // Grade each pick and create picks with results
    const picksWithResults: Pick[] = picks.map(pick => {
      const game = games.find(g => g.id === pick.gameId)
      if (!game) return null

      const result = gradePick(pick, game)
      return {
        id: pick.id,
        gameId: pick.gameId,
        pick: pick.pick,
        confidence: pick.confidence,
        result: result,
        game: game
      }
    }).filter(Boolean) as Pick[]
    
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
                href="/leaderboard"
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
              </a>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                <p className="text-gray-600">Week {week} Picks • Season {currentSeason}</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Week {week} Performance</h3>
          <div className="text-sm text-blue-800">
            <p>Record: {weeklyScore?.wins || 0}-{weeklyScore?.losses || 0}-{weeklyScore?.ties || 0}</p>
            <p>Total Picks: {picksWithResults.length}</p>
            <p>Win Rate: {picksWithResults.length > 0 ? Math.round(((weeklyScore?.wins || 0) / picksWithResults.length) * 100) : 0}%</p>
          </div>
        </div>

        {/* Games Header */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Week {week} Games ({games.length})</h2>
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

        {/* User's Picks */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">{user.name}'s Picks</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {games.map((game) => {
              const userPick = picksWithResults.find((pick: Pick) => pick.gameId === game.id) || null
              
              return (
                <div key={game.id} className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                  <div className="text-xs text-gray-500 mb-2">
                    {game.awayTeam} @ {game.homeTeam}
                  </div>
                  
                  {userPick ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center space-x-2">
                        <div className={`text-sm font-medium ${
                          userPick.pick === 'home' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {userPick.pick === 'home' ? game.homeTeam : game.awayTeam}
                        </div>
                        {getResultIcon(userPick.result)}
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
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading user picks:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">Failed to load user picks</p>
          <a href="/leaderboard" className="btn-primary">
            Go Back
          </a>
        </div>
      </div>
    )
  }
}
