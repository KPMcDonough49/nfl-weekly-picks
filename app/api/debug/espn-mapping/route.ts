import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch ESPN data
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`ESPN API request failed: ${response.status}`);
    }

    const data = await response.json();
    const games = data.events || [];
    
    // Find Eagles game
    const eaglesGame = games.find((game: any) => {
      const competition = game.competitions[0];
      if (!competition) return false;
      
      const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
      const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
      
      return homeTeam?.team.abbreviation === 'PHI' || awayTeam?.team.abbreviation === 'PHI';
    });

    if (!eaglesGame) {
      return NextResponse.json({ success: false, error: 'Eagles game not found in ESPN data' });
    }

    const competition = eaglesGame.competitions[0];
    const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
    const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');

    // Team mapping
    const teamMapping: { [key: string]: string } = {
      'DAL': 'Dallas Cowboys',
      'PHI': 'Philadelphia Eagles',
      // ... other teams
    };

    const homeTeamName = teamMapping[homeTeam.team.abbreviation] || homeTeam.team.displayName;
    const awayTeamName = teamMapping[awayTeam.team.abbreviation] || awayTeam.team.displayName;

    return NextResponse.json({
      success: true,
      data: {
        espnGame: {
          homeTeam: {
            abbreviation: homeTeam.team.abbreviation,
            displayName: homeTeam.team.displayName,
            score: homeTeam.score
          },
          awayTeam: {
            abbreviation: awayTeam.team.abbreviation,
            displayName: awayTeam.team.displayName,
            score: awayTeam.score
          }
        },
        mappedNames: {
          homeTeamName,
          awayTeamName
        }
      }
    });

  } catch (error) {
    console.error('Error debugging ESPN mapping:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
