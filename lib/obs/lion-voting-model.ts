export type LionVotingCandidate = {
  id: number
  player_name: string
  team_name: string
  votes: number | null
  is_hidden?: boolean | null
}

export type LionVotingSnapshot = {
  homeTeam: string
  awayTeam: string
  totalVotes: number
  leaders: {
    id: number
    playerName: string
    teamName: string
    votes: number
    percent: number
  }[]
}

export function parseLionVotingMatchId(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const matchId = Number(value)
  return Number.isSafeInteger(matchId) && matchId > 0 ? matchId : null
}

export function createLionVotingSnapshot(
  match: { home_team: string; away_team: string },
  candidates: readonly LionVotingCandidate[],
): LionVotingSnapshot {
  const visible = candidates
    .filter((candidate) => !candidate.is_hidden)
    .map((candidate) => ({
      ...candidate,
      votes: Number.isSafeInteger(candidate.votes) && (candidate.votes ?? 0) > 0 ? candidate.votes! : 0,
    }))
  // The denominator includes every visible candidate, including those outside the top three.
  const totalVotes = visible.reduce((total, candidate) => total + candidate.votes, 0)
  visible.sort((left, right) => right.votes - left.votes || left.id - right.id)

  return {
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    totalVotes,
    leaders: visible.slice(0, 3).map((candidate) => ({
      id: candidate.id,
      playerName: candidate.player_name,
      teamName: candidate.team_name,
      votes: candidate.votes,
      percent: totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0,
    })),
  }
}

/** GET validators use weak comparison, including a list of entity tags. */
export function matchesLionVotingEtag(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false
  if (ifNoneMatch.trim() === "*") return true
  const current = etag.replace(/^W\//, "")
  const tags = /(?:^|,)\s*(?:W\/)?("[\x21\x23-\x7e\x80-\xff]*")\s*(?=,|$)/g
  for (const match of ifNoneMatch.matchAll(tags)) {
    if (match[1] === current) return true
  }
  return false
}
