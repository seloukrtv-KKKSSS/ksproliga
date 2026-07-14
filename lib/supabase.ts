import { createClient } from "@supabase/supabase-js"

// For development/demo purposes, we'll use placeholder values if env vars aren't available
const supabaseUrl =
  process.env.NEW_NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEW_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://placeholder.supabase.co" // Fallback for demo

const supabaseAnonKey =
  process.env.NEW_NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEW_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "placeholder-anon-key" // Fallback for demo

// Create a mock client if we're using placeholder values
const isUsingPlaceholder = supabaseUrl === "https://placeholder.supabase.co"

if (isUsingPlaceholder) {
  console.warn("Using placeholder Supabase configuration. Database operations will be mocked.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Championship {
  id: number
  name: string
  season: string
  is_active: boolean
  tournament_type: "league" | "cup"
  created_at: string
}

export interface Team {
  id: number
  name: string
  logo?: string
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
