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

export interface ProAvatar {
  skin_tone: string // "fair" | "peach" | "tan" | "bronze" | "dark"
  face_shape: string // "oval" | "square" | "round" | "sharp"
  hair_style: string // "short_fade" | "buzz" | "curly" | "mohawk" | "long" | "classic" | "dreadlocks" | "slick"
  hair_color: string // "black" | "dark_brown" | "light_brown" | "blonde" | "ginger" | "platinum"
  eye_shape: string // "normal" | "narrow" | "wide"
  eye_color: string // "brown" | "blue" | "green" | "amber" | "dark"
  nose_type: string // "straight" | "button" | "roman" | "wide"
  mouth_type: string // "smile" | "neutral" | "confident" | "smirk"
  facial_hair: string // "none" | "stubble" | "mustache" | "full_beard" | "goatee"
}

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
  year: number
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
  newspaper_highlight?: string
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

export interface ProInventory {
  boots: string
  car: string
  house: string
  trainers: string[]
  all_boots: string[]
  all_cars: string[]
  all_houses: string[]
}

export interface ProScoutInterest {
  tier2: number
  tier3: number
  tier4: number
  tier5: number
}

export interface ProNewsArticle {
  id: string
  newspaper_name: string
  headline: string
  text: string
  date_str: string
  importance: "low" | "medium" | "high" | "breaking"
  tag: string
  rating?: number
  goals_scored?: number
}

export interface ProCupMatch {
  stage_name: string // "1/8 фіналу", "1/4 фіналу", "Півфінал", "ФІНАЛ"
  opponent_club: ProClub
  is_home: boolean
  is_played: boolean
  home_score?: number
  away_score?: number
  is_winner?: boolean
}

export interface ProCupStatus {
  cup_name: string
  current_stage_index: number
  is_eliminated: boolean
  is_champion: boolean
  fixtures: ProCupMatch[]
}

export interface ProCareer {
  id: number
  user_id: number
  first_name: string
  last_name: string
  nickname?: string
  avatar: ProAvatar
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
  bank_balance: number // ₴ Особисті гроші футболіста
  inventory: ProInventory
  scout_interest: ProScoutInterest
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
  contract_signed_this_season?: boolean
  last_rest_timestamp?: number // ms
  last_spa_timestamp?: number // ms
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
  news_articles: ProNewsArticle[]
  cup_status?: ProCupStatus
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
  base_probability: number
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

export interface ProMatchEarnings {
  wage: number
  goal_bonus: number
  assist_bonus: number
  win_bonus: number
  total: number
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
  earnings: ProMatchEarnings
  coach_commentary: string
  news_article?: ProNewsArticle
  season_number: number
  fixture_round: number
  match_type: "league" | "cup" | "friendly"
  is_match_fixed?: boolean
}

export interface ProStoryChoice {
  text: string
  impact_description: string
  morale_delta?: number
  form_delta?: number
  rep_delta?: number
  wage_mult?: number
  money_delta?: number
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

export interface ProStoreItem {
  id: string
  name: string
  category: "trainers" | "boots" | "cars" | "houses"
  price: number
  description: string
  stat_boost: string
  icon: string
  attribute_boost?: {
    key: keyof ProAttributes
    value: number
  }
  morale_boost?: number
  rep_boost?: number
}

export interface ProScoutRequirement {
  tier: number
  tier_name: string
  min_ovr: number
  min_matches: number
  min_goal_contributions: number
  min_avg_rating: number
  scout_interest: number
  is_unlocked: boolean
  progress_percent: number
  missing_reasons: string[]
}

export interface ProLeaderboardEntry {
  id: number
  user_id: number
  player_name: string
  nickname?: string
  username: string
  club_name: string
  club_city: string
  tier: number
  age: number
  position: ProPosition
  overall_rating: number
  bank_balance: number
  wage_per_week: number
  matches: number
  goals: number
  assists: number
  avg_rating: number
  trophies_count: number
  legacy_score: number
  is_current_user?: boolean
}
