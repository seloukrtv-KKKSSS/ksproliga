export type PlayerPosition =
  | "GK"
  | "LD"
  | "CD"
  | "RD"
  | "LM"
  | "CM"
  | "RM"
  | "LF"
  | "CF"
  | "RF"
  // Aliases for compatibility
  | "LB"
  | "CB"
  | "RB"
  | "CDM"
  | "CAM"
  | "LW"
  | "RW"
  | "ST"

export type FMSection =
  | "dashboard"
  | "squad"
  | "tournaments"
  | "training"
  | "city"
  | "transfers"
  | "youth"
  | "league"

export type SpecialAbilityId =
  | "pass"
  | "long_shot"
  | "tackling"
  | "header"
  | "speed"
  | "playmaker"
  | "penalty"
  | "one_on_one"
  | "interception"
  | "gk_reaction"
  | "gk_exit"
  | "dribbling"

export interface SpecialAbilityDef {
  id: SpecialAbilityId
  name: string
  shortCode: string
  description: string
  icon: string
  allowedPositions: ("GK" | "DEF" | "MID" | "FWD")[]
  costXp: number
  costMoney: number
}

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
  cups_won?: number
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
  secondary_position?: PlayerPosition | null
  skill: number            // 11x11.ru core numeric rating (e.g. 50 - 450+)
  talent: number           // 11x11.ru star rating (1 to 6 stars)
  special_abilities: SpecialAbilityId[] // Perks / Спецуміння
  energy: number           // 0 - 100% (Fatigue / Фізична форма)
  morale: number           // 0 - 100%
  xp: number               // Unspent XP to upgrade skill or learn abilities
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

  // Legacy compatibility fallbacks
  overall_rating?: number
  stamina?: number
  form?: number
  potential?: number
  pace?: number
  shooting?: number
  passing?: number
  dribbling?: number
  defending?: number
  physical?: number
  goalkeeping?: number
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
  capacity: number             // Стадіон (місткість глядачів)
  pitch_level: number          // Газон (якість поля)
  base_level: number           // Клубна База (ліміт складу і будівель)
  fitness_level: number        // Фітнес-центр (швидкість відновлення сил)
  medical_level: number        // Медичний центр (швидкість лікування травм)
  youth_academy_level: number  // Школа юніорів (якість молоді)
  office_level: number         // Офіс клубу (слоти персоналу та спонсори)
  commercial_level: number     // Торговий центр (пасивний дохід від сувенірів)
  ticket_price: number         // Ціна квитка на матч (₴)
  training_level?: number      // compatibility
  marketing_level?: number     // compatibility
  updated_at?: string
}

export type StaffRole = "coach" | "doctor" | "masseur" | "scout"

export interface FMStaff {
  id: number
  club_id: number
  role: StaffRole
  name: string
  level: number       // 1 - 5
  salary: number      // ₴ per match/day
  bonus_desc: string
  created_at?: string
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
    | "special_ability"
  text: string
  team: "home" | "away"
  player_name?: string
  assist_player_name?: string
  ability_name?: string
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
  tournament_id?: number | null
  league_id?: number | null
  events_log: FMMatchEvent[]
  stats: FMMatchStats
  revenue: number
  xp_reward: number
  created_at?: string
  played_at?: string
}

export interface FMTournamentMatch {
  match_id?: number
  home_club_id: number
  home_club_name: string
  home_club_badge?: string
  home_club_color?: string
  away_club_id: number
  away_club_name: string
  away_club_badge?: string
  away_club_color?: string
  home_score?: number
  away_score?: number
  winner_club_id?: number
  is_played: boolean
}

export interface FMTournamentBracket {
  quarter_finals: FMTournamentMatch[] // 4 matches (8 teams)
  semi_finals: FMTournamentMatch[]    // 2 matches (4 teams)
  final: FMTournamentMatch            // 1 match (2 teams)
  winner_club_id?: number
  winner_club_name?: string
}

export interface FMTournament {
  id: number
  name: string
  tier: number
  status: "registration" | "quarter_finals" | "semi_finals" | "final" | "completed"
  bracket: FMTournamentBracket
  prize_pool: number
  entry_fee: number
  winner_club_id?: number | null
  winner_club_name?: string | null
  created_at?: string
}

export interface FMTransfer {
  id: number
  player_id: number
  player_name: string
  position: PlayerPosition
  skill: number
  talent: number
  special_abilities: SpecialAbilityId[]
  age: number
  seller_club_id: number
  seller_club_name?: string
  highest_bidder_club_id?: number | null
  highest_bidder_club_name?: string | null
  current_bid: number
  buyout_price: number
  price?: number
  ends_at: string
  status: "active" | "completed" | "cancelled"
  created_at?: string
}

export interface FMYouthProspect {
  id: number
  club_id: number
  name: string
  age: number
  position: PlayerPosition
  skill: number
  talent: number
  special_abilities: SpecialAbilityId[]
  signing_cost: number
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
