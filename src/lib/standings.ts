export interface GameLike {
  player1_id: string;
  player2_id: string;
  player1_points: number;
  player2_points: number;
  winner_id: string | null;
  is_draw: boolean;
  status: string;
}

export interface MemberLike {
  user_id: string;
  display_name: string;
  status: string;
}

export interface StandingRow {
  user_id: string;
  display_name: string;
  points: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
}

// Pure function — easy to tweak ranking later.
export function computeStandings(games: GameLike[], members: MemberLike[]): StandingRow[] {
  const approved = members.filter((m) => m.status === "approved");
  const rows = new Map<string, StandingRow>();
  for (const m of approved) {
    rows.set(m.user_id, {
      user_id: m.user_id,
      display_name: m.display_name,
      points: 0,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    });
  }

  const confirmed = games.filter((g) => g.status === "confirmed");
  for (const g of confirmed) {
    const p1 = rows.get(g.player1_id);
    const p2 = rows.get(g.player2_id);
    if (!p1 || !p2) continue;
    p1.played += 1;
    p2.played += 1;
    p1.points += g.player1_points;
    p2.points += g.player2_points;
    if (g.is_draw) {
      p1.draws += 1;
      p2.draws += 1;
    } else if (g.winner_id === g.player1_id) {
      p1.wins += 1;
      p2.losses += 1;
    } else {
      p2.wins += 1;
      p1.losses += 1;
    }
  }

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.played - b.played;
  });
}