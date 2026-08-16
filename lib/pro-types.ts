export type ProPosition =
  | "ST"
  | "RW"
  | "LW"
  | "CAM"
  | "CM"
  | "CDM"
  | "LB"
  | "CB"
  | "RB"
  | "GK"

export type ProFoot = "right" | "left" | "both"

export type ProSquadRole =
  | "reserve"
  | "rotation"
  | "starter"
  | "key_player"
  | "captain"

export interface ProAttributes {
  pace: number // Швидкість (ривки, спринт)
  shooting: number // Удар (сила, точність)
  passing: number // Пас (короткий, навіси, бачення)
  dribbling: number // Дриблінг (техніка, контроль)
  defending: number // Захист (відбір, перехоплення)
  physical: number // Фізика (боротьба, стрибучість)
  positioning: number // Позиціонування (вибір позиції, відкривання)
  decision_making: number // Прийняття рішень (інтелект гри)
  stamina: number // Витривалість (запас сил)
  goalkeeping?: number // Воротарська гра (реакція, гра на виходах)
}

export interface ProSeasonLog {
  season: number
  age: number
  club_name: string
  club_tier: number
  league_name: string
  matches: number
  goals: number
  assists: number
  avg_rating: number
  ovr_start: number
  ovr_end: number
  trophies_won: string[]
  honors?: string[]
}

export interface ProClubHistory {
  club_id: number
  club_name: string
  city: string
  tier: number
  from_year: number
  to_year?: number
  seasons_count: number
  matches: number
  goals: number
  assists: number
  is_legend?: boolean
}

export interface ProTrophy {
  id: string
  title: string
  season: number
  club_name: string
  icon: string
}

export interface ProCareer {
  id: number
  user_id: number
  first_name: string
  last_name: string
  nickname?: string
  age: number
  position: ProPosition
  secondary_positions: ProPosition[]
  foot: ProFoot
  height: number
  weight: number
  overall_rating: number
  potential: number
  form: number // 1..100%
  energy: number // 0..100%
  morale: number // 0..100%
  reputation: number // 0..1000
  current_club_id: number
  contract_years_left: number
  wage_per_week: number // ₴
  squad_role: ProSquadRole
  is_captain: boolean
  is_injured: boolean
  injury_name?: string
  injury_matches_left: number
  is_retired: boolean
  current_season_number: number
  current_fixture_round: number
  attributes: ProAttributes
  career_stats: {
    total_matches: number
    total_goals: number
    total_assists: number
    total_trophies: number
    avg_rating: number
    season_matches: number
    season_goals: number
    season_assists: number
  }
  season_logs: ProSeasonLog[]
  clubs_history: ProClubHistory[]
  trophies: ProTrophy[]
  created_at?: string
  updated_at?: string
}

export interface ProClub {
  id: number
  name: string
  short_name: string
  city: string
  region: string
  league_id: number
  tier: number // 1..5
  reputation: number
  primary_color: string
  secondary_color: string
  badge_symbol: string
  stadium_name: string
  stadium_capacity: number
  budget: number
  squad_strength: number
}

export interface ProLeague {
  id: number
  name: string
  tier: number
  region?: string
  reputation: number
}

export interface ProMomentChoice {
  id: string
  label: string
  description: string
  required_attributes: (keyof ProAttributes)[]
  base_probability: number // 0.1 .. 0.95
  risk_level: "low" | "medium" | "high"
}

export interface ProMomentOutcome {
  success: boolean
  result_type:
    | "goal"
    | "assist"
    | "shot_saved"
    | "tackle_won"
    | "turnover"
    | "pass_intercepted"
    | "foul_drawn"
    | "miss"
  commentary: string
  score_change?: { home: number; away: number }
  rating_impact: number
}

export interface ProMatchMoment {
  id: string
  minute: number
  title: string
  situation_text: string
  pitch_position:
    | "flank_left"
    | "flank_right"
    | "center_box"
    | "outside_box"
    | "defense_line"
    | "midfield"
    | "penalty_spot"
  choices: ProMomentChoice[]
  chosen_option_index?: number
  outcome?: ProMomentOutcome
}

export interface ProMatchResult {
  id?: number
  home_club: ProClub
  away_club: ProClub
  home_score: number
  away_score: number
  player_club_is_home: boolean
  player_played: boolean
  player_minutes: number
  player_goals: number
  player_assists: number
  player_rating: number
  player_shots: number
  player_tackles: number
  player_xg: number
  moments: ProMatchMoment[]
  season_number: number
  fixture_round: number
  match_type: "league" | "cup" | "friendly"
}

export interface ProStoryChoice {
  text: string
  impact_description: string
  morale_delta?: number
  form_delta?: number
  rep_delta?: number
  wage_mult?: number
  unlocks_transfer?: boolean
}

export interface ProStoryEvent {
  id?: number
  career_id?: number
  title: string
  character_name: string
  character_role:
    | "first_coach"
    | "scout"
    | "captain"
    | "teammate"
    | "doctor"
    | "agent"
    | "fans"
    | "journalist"
  dialogue_text: string
  choices: ProStoryChoice[]
  chosen_option_index?: number
  consequence_text?: string
  status?: "pending" | "resolved"
}

export interface ProTransferOffer {
  id: number
  career_id: number
  from_club: ProClub
  tier: number
  weekly_wage: number
  contract_years: number
  squad_role: ProSquadRole
  signing_bonus: number
  scout_pitch: string
  status: "pending" | "accepted" | "rejected"
  created_at: string
}

export interface ProAchievement {
  id: string
  title: string
  description: string
  icon: string
  is_unlocked: boolean
  unlocked_at?: string
}
