import { supabase } from "./supabase"
import {
  ProCareer,
  ProClub,
  ProLeague,
  ProMatchResult,
  ProStoryEvent,
  ProTransferOffer
} from "./pro-types"

const USER_STORAGE_KEY = "ks_pro_current_user"
const CAREER_STORAGE_KEY = "ks_pro_current_career"

export interface ProUser {
  id: number
  username: string
  email: string
}

// ─── AUTHENTICATION & LOCAL SESSION ───

export function proGetStoredUser(): ProUser | null {
  if (typeof window === "undefined") return null
  const data = localStorage.getItem(USER_STORAGE_KEY)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function proGetStoredCareer(): ProCareer | null {
  if (typeof window === "undefined") return null
  const data = localStorage.getItem(CAREER_STORAGE_KEY)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function proSaveStoredCareer(career: ProCareer) {
  if (typeof window === "undefined") return
  localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(career))
}

export function proLogout() {
  if (typeof window === "undefined") return
  localStorage.removeItem(USER_STORAGE_KEY)
  localStorage.removeItem(CAREER_STORAGE_KEY)
  localStorage.removeItem("ks_fm_unlocked")
  sessionStorage.removeItem("ks_fm_unlocked")
}

export async function proRegister(
  username: string,
  email: string
): Promise<ProUser> {
  const cleanUser = username.trim()
  const cleanEmail = email.trim().toLowerCase() || `${cleanUser.toLowerCase()}@ksliga.com`

  try {
    const { data: existing } = await supabase
      .from("pro_users")
      .select("id, username, email")
      .or(`username.eq.${cleanUser},email.eq.${cleanEmail}`)
      .maybeSingle()

    if (existing) {
      const user: ProUser = {
        id: Number(existing.id),
        username: existing.username,
        email: existing.email
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      }
      return user
    }

    const { data, error } = await supabase
      .from("pro_users")
      .insert({
        username: cleanUser,
        email: cleanEmail,
        password_hash: "hash_pro"
      })
      .select("id, username, email")
      .single()

    if (error) throw error

    const newUser: ProUser = {
      id: Number(data.id),
      username: data.username,
      email: data.email
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
    }
    return newUser
  } catch (err) {
    console.warn("DB proRegister fallback to offline mode:", err)
    const fallbackUser: ProUser = {
      id: 1,
      username: cleanUser,
      email: cleanEmail
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fallbackUser))
    }
    return fallbackUser
  }
}

// ─── CLUBS & LEAGUES ───

export async function proGetClubs(): Promise<ProClub[]> {
  try {
    const { data, error } = await supabase
      .from("pro_clubs")
      .select("*")
      .order("tier", { ascending: true })
      .order("reputation", { ascending: false })

    if (error || !data || data.length === 0) {
      return getFallbackClubs()
    }
    return data.map((c: any) => ({
      id: Number(c.id),
      name: c.name,
      short_name: c.short_name,
      city: c.city,
      region: c.region,
      league_id: Number(c.league_id),
      tier: Number(c.tier),
      reputation: Number(c.reputation),
      primary_color: c.primary_color || "#0F5E10",
      secondary_color: c.secondary_color || "#F59E0B",
      badge_symbol: c.badge_symbol || "shield",
      stadium_name: c.stadium_name || "Стадіон",
      stadium_capacity: Number(c.stadium_capacity) || 500,
      budget: Number(c.budget) || 10000,
      squad_strength: Number(c.squad_strength) || 45
    }))
  } catch {
    return getFallbackClubs()
  }
}

export async function proGetLeagues(): Promise<ProLeague[]> {
  try {
    const { data } = await supabase
      .from("pro_leagues")
      .select("*")
      .order("tier", { ascending: true })

    if (!data || data.length === 0) {
      return [
        { id: 1, name: "Снятинський & Коломийський Район (Село)", tier: 1, reputation: 80 },
        { id: 2, name: "Перша Ліга Області (Івано-Франківськ & Буковина)", tier: 2, reputation: 250 },
        { id: 3, name: "Друга Ліга України (ПФЛ)", tier: 3, reputation: 450 },
        { id: 4, name: "Перша Ліга України (ПФЛ)", tier: 4, reputation: 650 },
        { id: 5, name: "Українська Премʼєр Ліга (УПЛ)", tier: 5, reputation: 900 }
      ]
    }
    return data.map((l: any) => ({
      id: Number(l.id),
      name: l.name,
      tier: Number(l.tier),
      region: l.region,
      reputation: Number(l.reputation)
    }))
  } catch {
    return [
      { id: 1, name: "Снятинський & Коломийський Район (Село)", tier: 1, reputation: 80 },
      { id: 2, name: "Перша Ліга Області (Івано-Франківськ & Буковина)", tier: 2, reputation: 250 },
      { id: 3, name: "Друга Ліга України (ПФЛ)", tier: 3, reputation: 450 },
      { id: 4, name: "Перша Ліга України (ПФЛ)", tier: 4, reputation: 650 },
      { id: 5, name: "Українська Премʼєр Ліга (УПЛ)", tier: 5, reputation: 900 }
    ]
  }
}

// ─── CAREER CREATION & SYNC ───

export async function proGetCareerByUserId(
  userId: number
): Promise<ProCareer | null> {
  // First check local optimistic cache
  const cached = proGetStoredCareer()
  if (cached && cached.user_id === userId) {
    return cached
  }

  try {
    const { data, error } = await supabase
      .from("pro_careers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error || !data) return cached

    const career: ProCareer = {
      id: Number(data.id),
      user_id: Number(data.user_id),
      first_name: data.first_name,
      last_name: data.last_name,
      nickname: data.nickname,
      age: Number(data.age) || 17,
      position: data.position,
      secondary_positions: data.secondary_positions || [],
      foot: data.foot || "right",
      height: Number(data.height) || 180,
      weight: Number(data.weight) || 74,
      overall_rating: Number(data.overall_rating) || 42,
      potential: Number(data.potential) || 80,
      form: Number(data.form) || 75,
      energy: Number(data.energy) || 100,
      morale: Number(data.morale) || 100,
      reputation: Number(data.reputation) || 50,
      current_club_id: Number(data.current_club_id) || 1,
      contract_years_left: Number(data.contract_years_left) || 2,
      wage_per_week: Number(data.wage_per_week) || 1000,
      squad_role: data.squad_role || "starter",
      is_captain: Boolean(data.is_captain),
      is_injured: Boolean(data.is_injured),
      injury_name: data.injury_name,
      injury_matches_left: Number(data.injury_matches_left) || 0,
      is_retired: Boolean(data.is_retired),
      current_season_number: Number(data.current_season_number) || 1,
      current_fixture_round: Number(data.current_fixture_round) || 1,
      attributes: data.attributes,
      career_stats: data.career_stats || {
        total_matches: 0,
        total_goals: 0,
        total_assists: 0,
        total_trophies: 0,
        avg_rating: 7.0,
        season_matches: 0,
        season_goals: 0,
        season_assists: 0
      },
      season_logs: data.season_logs || [],
      clubs_history: data.clubs_history || [],
      trophies: data.trophies || []
    }

    proSaveStoredCareer(career)
    return career
  } catch (err) {
    console.warn("Error fetching pro career:", err)
    return cached
  }
}

export async function proCreateCareer(
  userId: number,
  careerData: Partial<ProCareer>
): Promise<ProCareer> {
  const newCareer: ProCareer = {
    id: Date.now(),
    user_id: userId,
    first_name: careerData.first_name || "Андрій",
    last_name: careerData.last_name || "Карпʼюк",
    nickname: careerData.nickname,
    age: 17,
    position: careerData.position || "RW",
    secondary_positions: careerData.secondary_positions || [],
    foot: careerData.foot || "left",
    height: careerData.height || 178,
    weight: careerData.weight || 72,
    overall_rating: careerData.overall_rating || 42,
    potential: careerData.potential || 85,
    form: 80,
    energy: 100,
    morale: 100,
    reputation: 60,
    current_club_id: careerData.current_club_id || 1,
    contract_years_left: 2,
    wage_per_week: 1200,
    squad_role: "starter",
    is_captain: false,
    is_injured: false,
    injury_matches_left: 0,
    is_retired: false,
    current_season_number: 1,
    current_fixture_round: 1,
    attributes: careerData.attributes as any,
    career_stats: {
      total_matches: 0,
      total_goals: 0,
      total_assists: 0,
      total_trophies: 0,
      avg_rating: 7.0,
      season_matches: 0,
      season_goals: 0,
      season_assists: 0
    },
    season_logs: [],
    clubs_history: [
      {
        club_id: careerData.current_club_id || 1,
        club_name: "ФК Тучапи",
        city: "Тучапи",
        tier: 1,
        from_year: 2026,
        seasons_count: 1,
        matches: 0,
        goals: 0,
        assists: 0
      }
    ],
    trophies: []
  }

  // Save to LocalStorage immediately (Zero-latency)
  proSaveStoredCareer(newCareer)

  try {
    const { data } = await supabase
      .from("pro_careers")
      .insert({
        user_id: userId,
        first_name: newCareer.first_name,
        last_name: newCareer.last_name,
        nickname: newCareer.nickname,
        age: 17,
        position: newCareer.position,
        secondary_positions: newCareer.secondary_positions,
        foot: newCareer.foot,
        height: newCareer.height,
        weight: newCareer.weight,
        overall_rating: newCareer.overall_rating,
        potential: newCareer.potential,
        form: newCareer.form,
        energy: newCareer.energy,
        morale: newCareer.morale,
        reputation: newCareer.reputation,
        current_club_id: newCareer.current_club_id,
        contract_years_left: newCareer.contract_years_left,
        wage_per_week: newCareer.wage_per_week,
        squad_role: newCareer.squad_role,
        is_captain: newCareer.is_captain,
        attributes: newCareer.attributes,
        career_stats: newCareer.career_stats,
        clubs_history: newCareer.clubs_history
      })
      .select("id")
      .single()

    if (data?.id) {
      newCareer.id = Number(data.id)
      proSaveStoredCareer(newCareer)
    }
  } catch (err) {
    console.warn("DB proCreateCareer insert warning:", err)
  }

  return newCareer
}

export async function proUpdateCareer(career: ProCareer): Promise<ProCareer> {
  proSaveStoredCareer(career)

  try {
    await supabase
      .from("pro_careers")
      .update({
        age: career.age,
        overall_rating: career.overall_rating,
        form: career.form,
        energy: career.energy,
        morale: career.morale,
        reputation: career.reputation,
        current_club_id: career.current_club_id,
        contract_years_left: career.contract_years_left,
        wage_per_week: career.wage_per_week,
        squad_role: career.squad_role,
        is_captain: career.is_captain,
        is_injured: career.is_injured,
        injury_name: career.injury_name,
        injury_matches_left: career.injury_matches_left,
        is_retired: career.is_retired,
        current_season_number: career.current_season_number,
        current_fixture_round: career.current_fixture_round,
        attributes: career.attributes,
        career_stats: career.career_stats,
        season_logs: career.season_logs,
        clubs_history: career.clubs_history,
        trophies: career.trophies
      })
      .eq("id", career.id)
  } catch (err) {
    console.warn("DB update sync:", err)
  }

  return career
}

// ─── MATCH SAVING ───

export async function proSaveMatch(
  career: ProCareer,
  result: ProMatchResult
): Promise<ProCareer> {
  // Update career statistics optimistically
  const totalMatches = career.career_stats.total_matches + 1
  const totalGoals = career.career_stats.total_goals + result.player_goals
  const totalAssists = career.career_stats.total_assists + result.player_assists
  const currentTotalRating = career.career_stats.avg_rating * career.career_stats.total_matches
  const newAvgRating = Math.round(((currentTotalRating + result.player_rating) / totalMatches) * 10) / 10

  const seasonMatches = career.career_stats.season_matches + 1
  const seasonGoals = career.career_stats.season_goals + result.player_goals
  const seasonAssists = career.career_stats.season_assists + result.player_assists

  // Update club history
  const updatedClubsHistory = career.clubs_history.map((ch) => {
    if (ch.club_id === career.current_club_id) {
      return {
        ...ch,
        matches: ch.matches + 1,
        goals: ch.goals + result.player_goals,
        assists: ch.assists + result.player_assists
      }
    }
    return ch
  })

  // Energy & Form adjustments
  const newEnergy = Math.max(15, career.energy - (12 + Math.floor(Math.random() * 6)))
  const formDelta = result.player_rating >= 8.0 ? 5 : result.player_rating >= 7.0 ? 2 : -3
  const newForm = Math.max(20, Math.min(100, career.form + formDelta))
  const newReputation = career.reputation + (result.player_goals * 4 + result.player_assists * 2 + (result.player_rating >= 7.5 ? 3 : 0))

  const updatedCareer: ProCareer = {
    ...career,
    energy: newEnergy,
    form: newForm,
    reputation: newReputation,
    current_fixture_round: career.current_fixture_round + 1,
    career_stats: {
      ...career.career_stats,
      total_matches: totalMatches,
      total_goals: totalGoals,
      total_assists: totalAssists,
      avg_rating: newAvgRating,
      season_matches: seasonMatches,
      season_goals: seasonGoals,
      season_assists: seasonAssists
    },
    clubs_history: updatedClubsHistory
  }

  // Save to DB and local storage
  await proUpdateCareer(updatedCareer)

  try {
    await supabase.from("pro_matches").insert({
      career_id: career.id,
      home_club_id: result.home_club.id,
      away_club_id: result.away_club.id,
      home_club_name: result.home_club.name,
      away_club_name: result.away_club.name,
      home_score: result.home_score,
      away_score: result.away_score,
      player_club_is_home: result.player_club_is_home,
      player_played: true,
      player_minutes: result.player_minutes,
      player_goals: result.player_goals,
      player_assists: result.player_assists,
      player_rating: result.player_rating,
      player_shots: result.player_shots,
      player_tackles: result.player_tackles,
      player_xg: result.player_xg,
      moments_log: result.moments,
      season_number: career.current_season_number,
      fixture_round: career.current_fixture_round
    })
  } catch (err) {
    console.warn("DB pro_matches insert warning:", err)
  }

  return updatedCareer
}

function getFallbackClubs(): ProClub[] {
  return [
    {
      id: 1,
      name: "ФК Тучапи",
      short_name: "ТУЧ",
      city: "Тучапи",
      region: "Івано-Франківська обл.",
      league_id: 1,
      tier: 1,
      reputation: 60,
      primary_color: "#166534",
      secondary_color: "#FACC15",
      badge_symbol: "shield",
      stadium_name: "Сільський Стадіон «Колос»",
      stadium_capacity: 350,
      budget: 15000,
      squad_strength: 40
    },
    {
      id: 2,
      name: "ФК Снятин",
      short_name: "СНЯ",
      city: "Снятин",
      region: "Івано-Франківська обл.",
      league_id: 1,
      tier: 1,
      reputation: 95,
      primary_color: "#1E3A8A",
      secondary_color: "#E0E7FF",
      badge_symbol: "shield",
      stadium_name: "Міський Стадіон «Колос»",
      stadium_capacity: 800,
      budget: 35000,
      squad_strength: 44
    },
    {
      id: 3,
      name: "Покуття",
      short_name: "ПОК",
      city: "Коломия",
      region: "Івано-Франківська обл.",
      league_id: 2,
      tier: 2,
      reputation: 260,
      primary_color: "#C2410C",
      secondary_color: "#FEF08A",
      badge_symbol: "shield",
      stadium_name: "Стадіон «Юність»",
      stadium_capacity: 3500,
      budget: 150000,
      squad_strength: 55
    },
    {
      id: 4,
      name: "Прикарпаття",
      short_name: "ПРК",
      city: "Івано-Франківськ",
      region: "Івано-Франківська обл.",
      league_id: 4,
      tier: 4,
      reputation: 660,
      primary_color: "#15803D",
      secondary_color: "#FEF08A",
      badge_symbol: "shield",
      stadium_name: "МЦС «Рух»",
      stadium_capacity: 15000,
      budget: 850000,
      squad_strength: 75
    },
    {
      id: 5,
      name: "Динамо Київ",
      short_name: "ДИН",
      city: "Київ",
      region: "Київ",
      league_id: 5,
      tier: 5,
      reputation: 950,
      primary_color: "#1D4ED8",
      secondary_color: "#FFFFFF",
      badge_symbol: "shield",
      stadium_name: "НСК «Олімпійський»",
      stadium_capacity: 70050,
      budget: 5000000,
      squad_strength: 88
    }
  ]
}
