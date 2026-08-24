import { createClient } from "@supabase/supabase-js"

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const configuredKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

function isHttpUrl(value?: string): value is string {
  if (!value) return false

  try {
    const url = new URL(value)
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname)
  } catch {
    return false
  }
}

function isUsablePublicKey(value?: string): value is string {
  return Boolean(value && value.length >= 20 && !/^\*+$/.test(value) && !value.includes("placeholder"))
}

export const isSupabaseConfigured = isHttpUrl(configuredUrl) && isUsablePublicKey(configuredKey)

const supabaseUrl = isSupabaseConfigured && configuredUrl ? configuredUrl : "https://placeholder.supabase.co"
const supabaseAnonKey = isSupabaseConfigured && configuredKey ? configuredKey : "placeholder-anon-key"

if (!isSupabaseConfigured && process.env.NODE_ENV === "development") {
  console.warn("Supabase is not configured; the app will use local demo data.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
})

export interface Championship {
  id: number
  name: string
  season: string
  is_active: boolean
  tournament_type: "league" | "cup"
  sort_order?: number
  created_at: string
}

export interface Team {
  id: number
  name: string
  logo?: string
  city?: string
  roster?: string[]
  championship_id: number
  created_at: string
}

export interface Match {
  id: number
  round: number
  date: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  is_finished: boolean
  championship_id: number
  match_time?: string
  cup_stage?: string
  is_technical_defeat?: boolean
  technical_winner?: string
  penalty_home?: number | null
  penalty_away?: number | null
  penalty_winner?: string
  youtube_url?: string | null
  created_at: string
}

export interface Player {
  id: number
  name: string
  team: string
  goals: number
  championship_id: number
  created_at: string
}

export interface MatchGoal {
  id: number
  match_id: number
  player_name: string
  team_name: string
  minute?: number
  goal_type: "regular" | "penalty" | "own_goal"
  created_at: string
}

export interface MatchCard {
  id: number
  match_id: number
  player_name: string
  team_name: string
  minute?: number
  card_type: "yellow" | "red" | "yellow_red"
  created_at: string
}

export interface MatchVoting {
  match_id: number
  is_active: boolean
  start_time: string | null
  end_time: string | null
  created_at: string
}

export interface VotingCandidate {
  id: number
  match_id: number
  player_name: string
  team_name: string
  votes: number
  is_hidden?: boolean
  created_at: string
}

export interface Organizer {
  user_id: string
  name: string
  email: string
  role: "admin" | "organizer"
  championship_ids: number[]
  is_active: boolean
  last_login_at?: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  title: string
  description: string
  price: number
  old_price?: number | null
  images: string[]
  badge?: string | null
  instagram_url?: string | null
  is_available: boolean
  sort_order?: number
  is_official?: boolean
  is_approved?: boolean
  author_name?: string
  author_user_id?: string | null
  created_at: string
}

export interface UserAnalytics {
  id: number
  session_id: string
  active_tab: string
  duration_seconds: number
  user_agent?: string
  created_at: string
}

export interface OrganizerLog {
  id: number
  organizer_name: string
  action_type: string
  description: string
  details?: unknown
  created_at: string
}

export interface GameScore {
  id: number
  player_name: string
  game_type: "dino" | "snake"
  score: number
  created_at: string
}


