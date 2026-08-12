export type PlayerPosition =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LM"
  | "RM"
  | "LW"
  | "RW"
  | "ST"

export type FormationType =
  | "4-4-2"
  | "4-3-3"
  | "3-5-2"
  | "4-2-3-1"
  | "5-3-2"
  | "4-1-4-1"
  | "3-4-3"

export type TeamMentality = "very_defensive" | "defensive" | "balanced" | "attacking" | "all_out_attack"
export type PassingStyle = "short" | "mixed" | "direct" | "long_ball"
export type PressingIntensity = "low" | "normal" | "high" | "intense"
export type TacklingAggression = "cautious" | "normal" | "aggressive" | "reckless"

export interface FMUser {
  id: number
  email: string
  username: string
  password_hash: string
  is_verified: boolean
  verification_code?: string | null
  created_at?: string
  last_active_at?: string
}

export interface FMClub {
  id: number
  user_id?: number | null
  name: string
  short_name?: string
  city: string
  badge_symbol: string
  primary_color: string
  secondary_color: string
  balance: number
  manager_level: number
  manager_xp: number
  reputation: number
  fans_count: number
  league_id?: number | null
  is_bot: boolean
  created_at?: string
  updated_at?: string
}

export interface FMPlayer {
  id: number
  club_id: number
  name: string
  nationality: string
  age: number
  position: PlayerPosition
  overall_rating: number
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
  goalkeeping: number
  stamina: number
  morale: number
  form: number
  potential: number
  market_value: number
  wage: number
  matches_played: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  is_starter: boolean
  pitch_slot: number
  is_on_transfer: boolean
  transfer_price: number
  is_injured: boolean
  injury_matches: number
  created_at?: string
}

export interface FMTactics {
  id?: number
  club_id: number
  formation: FormationType
  mentality: TeamMentality
  passing_style: PassingStyle
  pressing: PressingIntensity
  tackling: TacklingAggression
  captain_player_id?: number | null
  penalty_taker_id?: number | null
  freekick_taker_id?: number | null
  updated_at?: string
}

export interface FMStadium {
  id?: number
  club_id: number
  name: string
  capacity: number
  pitch_level: number
  training_level: number
  medical_level: number
  youth_academy_level: number
  marketing_level: number
  ticket_price: number
  updated_at?: string
}

export interface FMMatchEvent {
  minute: number
  type:
    | "whistle"
    | "goal"
    | "save"
    | "shot_miss"
    | "yellow_card"
    | "red_card"
    | "injury"
    | "chance"
    | "penalty"
    | "foul"
  text: string
  team: "home" | "away"
  player_name?: string
  assist_player_name?: string
  is_home: boolean
  home_score_at_time?: number
  away_score_at_time?: number
}

export interface FMMatchStats {
  home_possession: number
  away_possession: number
  home_shots: number
  away_shots: number
  home_shots_on_target: number
  away_shots_on_target: number
  home_xg: number
  away_xg: number
  home_fouls: number
  away_fouls: number
  home_corners: number
  away_corners: number
  home_yellows: number
  away_yellows: number
  home_reds: number
  away_reds: number
}

export interface FMMatch {
  id?: number
  home_club_id: number
  away_club_id: number
  home_club_name: string
  away_club_name: string
  home_score: number
  away_score: number
  is_played: boolean
  match_type: "friendly" | "league" | "cup"
  league_id?: number | null
  events_log: FMMatchEvent[]
  stats: FMMatchStats
  revenue: number
  xp_reward: number
  created_at?: string
  played_at?: string
}

export interface FMTransfer {
  id: number
  player_id: number
  player_name: string
  position: PlayerPosition
  rating: number
  seller_club_id: number
  seller_club_name?: string
  buyer_club_id?: number | null
  price: number
  status: "active" | "completed" | "cancelled"
  created_at?: string
}

export interface FMYouthProspect {
  id: number
  club_id: number
  name: string
  age: number
  position: PlayerPosition
  potential: number
  rating: number
  attributes: {
    pace: number
    shooting: number
    passing: number
    dribbling: number
    defending: number
    physical: number
    goalkeeping: number
  }
  scouted_at?: string
  is_signed: boolean
}

export interface FMLeague {
  id: number
  name: string
  tier: number
  season: string
  max_teams: number
  created_at?: string
}

export interface FMLeagueStanding {
  id?: number
  league_id: number
  club_id: number
  club_name: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
  updated_at?: string
}
