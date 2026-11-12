import type { Match, MatchGoal, MatchCard } from './supabase'
import { playerNameKey } from './player-stats'

export function summarizePlayerEvents(name: string, team: string, matchId: number, goals: MatchGoal[], cards: MatchCard[]) {
  const own = (event: MatchGoal | MatchCard) => event.match_id === matchId && event.team_name === team && playerNameKey(event.player_name) === playerNameKey(name)
  return {
    goals: goals.filter(event => own(event) && event.goal_type !== 'own_goal').length,
    yellow: cards.filter(event => own(event) && event.card_type !== 'red').length,
    red: cards.filter(event => own(event) && event.card_type !== 'yellow').length,
  }
}

export function summarizeMatchGoals(match: Match, goals: MatchGoal[]) {
  const total = (team: string, opponent: string) => goals.filter(goal => goal.match_id === match.id &&
    ((goal.team_name === team && goal.goal_type !== 'own_goal') || (goal.team_name === opponent && goal.goal_type === 'own_goal'))).length
  return { home: total(match.home_team, match.away_team), away: total(match.away_team, match.home_team) }
}
