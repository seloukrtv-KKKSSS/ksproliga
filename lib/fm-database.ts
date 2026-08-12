import { supabase } from "./supabase"
import {
  FMUser,
  FMClub,
  FMPlayer,
  FMTactics,
  FMStadium,
  FMMatch,
  FMTransfer,
  FMYouthProspect,
  FMLeague,
  FMLeagueStanding
} from "./fm-types"
import { generateStarterSquad, generateYouthProspect, SimulationResult } from "./fm-engine"

const CURRENT_USER_KEY = "fm_current_user_id"
const CURRENT_CLUB_KEY = "fm_current_club_id"

// ==========================================
// 1. AUTHENTICATION & SESSIONS
// ==========================================

export async function fmRegisterUser(email: string, username: string, passwordHash: string): Promise<{ user: FMUser | null; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = username.trim()

    // Check if user already exists
    const { data: existing } = await supabase
      .from("fm_users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle()

    if (existing) {
      return { user: null, error: "Користувач із таким email вже зареєстрований" }
    }

    const { data: newUser, error } = await supabase
      .from("fm_users")
      .insert([
        {
          email: cleanEmail,
          username: cleanName,
          password_hash: passwordHash,
          is_verified: true,
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        }
      ])
      .select("*")
      .single()

    if (error || !newUser) {
      console.error("Registration error:", error)
      // Fallback local mock user for smooth experience
      const mockUser: FMUser = {
        id: Date.now(),
        email: cleanEmail,
        username: cleanName,
        password_hash: passwordHash,
        is_verified: true,
        created_at: new Date().toISOString()
      }
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mockUser))
      return { user: mockUser }
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser))
    return { user: newUser }
  } catch (err: any) {
    console.error("fmRegisterUser exception:", err)
    return { user: null, error: err.message || "Помилка реєстрації" }
  }
}

export async function fmLoginUser(email: string, passwordHash: string): Promise<{ user: FMUser | null; club: FMClub | null; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase()

    const { data: user, error } = await supabase
      .from("fm_users")
      .select("*")
      .eq("email", cleanEmail)
      .eq("password_hash", passwordHash)
      .maybeSingle()

    if (error || !user) {
      // Check localStorage fallback
      const local = localStorage.getItem(CURRENT_USER_KEY)
      if (local) {
        const parsed = JSON.parse(local) as FMUser
        if (parsed.email === cleanEmail && parsed.password_hash === passwordHash) {
          const club = await fmGetClubByUserId(parsed.id)
          return { user: parsed, club }
        }
      }
      return { user: null, club: null, error: "Невірний email або пароль" }
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    const club = await fmGetClubByUserId(user.id)
    return { user, club }
  } catch (err: any) {
    console.error("fmLoginUser exception:", err)
    return { user: null, club: null, error: err.message || "Помилка входу" }
  }
}

export function fmGetStoredUser(): FMUser | null {
  if (typeof window === "undefined") return null
  const local = localStorage.getItem(CURRENT_USER_KEY)
  if (!local) return null
  try {
    return JSON.parse(local) as FMUser
  } catch {
    return null
  }
}

export function fmLogout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CURRENT_USER_KEY)
    localStorage.removeItem(CURRENT_CLUB_KEY)
  }
}

// ==========================================
// 2. CLUB MANAGEMENT
// ==========================================

export async function fmGetClubByUserId(userId: number): Promise<FMClub | null> {
  try {
    const { data: club, error } = await supabase
      .from("fm_clubs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error || !club) {
      const local = localStorage.getItem(CURRENT_CLUB_KEY)
      if (local) {
        return JSON.parse(local) as FMClub
      }
      return null
    }

    localStorage.setItem(CURRENT_CLUB_KEY, JSON.stringify(club))
    return club
  } catch {
    const local = localStorage.getItem(CURRENT_CLUB_KEY)
    return local ? JSON.parse(local) : null
  }
}

export async function fmCreateClub(
  userId: number,
  clubData: {
    name: string
    shortName?: string
    city: string
    badgeSymbol: string
    primaryColor: string
    secondaryColor: string
  }
): Promise<{ club: FMClub; players: FMPlayer[] }> {
  const { name, shortName, city, badgeSymbol, primaryColor, secondaryColor } = clubData

  // 1. Insert Club
  const { data: club, error: clubErr } = await supabase
    .from("fm_clubs")
    .insert([
      {
        user_id: userId,
        name,
        short_name: shortName || name.slice(0, 3).toUpperCase(),
        city,
        badge_symbol: badgeSymbol,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        balance: 300000,
        manager_level: 1,
        manager_xp: 0,
        reputation: 110,
        fans_count: 2000,
        league_id: 1,
        is_bot: false
      }
    ])
    .select("*")
    .single()

  const finalClub: FMClub = club || {
    id: Date.now(),
    user_id: userId,
    name,
    short_name: shortName || name.slice(0, 3).toUpperCase(),
    city,
    badge_symbol: badgeSymbol,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    balance: 300000,
    manager_level: 1,
    manager_xp: 0,
    reputation: 110,
    fans_count: 2000,
    league_id: 1,
    is_bot: false
  }

  localStorage.setItem(CURRENT_CLUB_KEY, JSON.stringify(finalClub))

  // 2. Insert Stadium
  await supabase.from("fm_stadiums").insert([
    {
      club_id: finalClub.id,
      name: `Арена ${finalClub.name}`,
      capacity: 5000,
      pitch_level: 1,
      training_level: 1,
      medical_level: 1,
      youth_academy_level: 1,
      marketing_level: 1,
      ticket_price: 15
    }
  ])

  // 3. Insert Tactics
  await supabase.from("fm_tactics").insert([
    {
      club_id: finalClub.id,
      formation: "4-4-2",
      mentality: "balanced",
      passing_style: "mixed",
      pressing: "normal",
      tackling: "normal"
    }
  ])

  // 4. Generate Starter Squad
  const starterPlayersRaw = generateStarterSquad(finalClub.id)
  const { data: createdPlayers } = await supabase
    .from("fm_players")
    .insert(starterPlayersRaw)
    .select("*")

  const finalPlayers: FMPlayer[] = (createdPlayers && createdPlayers.length > 0)
    ? createdPlayers
    : starterPlayersRaw.map((p, i) => ({ ...p, id: Date.now() + i }))

  // 5. Add to League Standings
  await supabase.from("fm_league_standings").insert([
    {
      league_id: 1,
      club_id: finalClub.id,
      club_name: finalClub.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      points: 0
    }
  ])

  return { club: finalClub, players: finalPlayers }
}

export async function fmUpdateClub(clubId: number, updates: Partial<FMClub>): Promise<FMClub | null> {
  const { data: updated } = await supabase
    .from("fm_clubs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", clubId)
    .select("*")
    .maybeSingle()

  if (updated) {
    localStorage.setItem(CURRENT_CLUB_KEY, JSON.stringify(updated))
    return updated
  }
  return null
}

// ==========================================
// 3. PLAYERS & SQUAD
// ==========================================

export async function fmGetClubPlayers(clubId: number): Promise<FMPlayer[]> {
  try {
    const { data: players, error } = await supabase
      .from("fm_players")
      .select("*")
      .eq("club_id", clubId)
      .order("overall_rating", { ascending: false })

    if (error || !players || players.length === 0) {
      // Fallback generator if empty
      const generated = generateStarterSquad(clubId).map((p, idx) => ({ ...p, id: Date.now() + idx }))
      return generated
    }

    return players
  } catch {
    return []
  }
}

export async function fmSaveSquadSlots(clubId: number, assignments: { id: number; is_starter: boolean; pitch_slot: number }[]): Promise<boolean> {
  try {
    for (const a of assignments) {
      await supabase
        .from("fm_players")
        .update({ is_starter: a.is_starter, pitch_slot: a.pitch_slot })
        .eq("id", a.id)
    }
    return true
  } catch (err) {
    console.error("Error saving squad slots:", err)
    return false
  }
}

export async function fmTrainSquad(clubId: number, boostXp: number, staminaCost: number): Promise<FMPlayer[]> {
  const players = await fmGetClubPlayers(clubId)
  const updatedList: FMPlayer[] = []

  for (const p of players) {
    const newStamina = Math.max(15, p.stamina - staminaCost)
    let shouldLevelUp = Math.random() < 0.35
    let newOverall = p.overall_rating
    let newPace = p.pace
    let newShooting = p.shooting
    let newPassing = p.passing
    let newDribbling = p.dribbling
    let newDefending = p.defending

    if (shouldLevelUp && p.overall_rating < p.potential) {
      newOverall = Math.min(95, p.overall_rating + 1)
      if (p.position === "ST") newShooting = Math.min(99, newShooting + 1)
      else if (p.position.includes("M")) newPassing = Math.min(99, newPassing + 1)
      else if (p.position.includes("B")) newDefending = Math.min(99, newDefending + 1)
      else newPace = Math.min(99, newPace + 1)
    }

    const { data: updated } = await supabase
      .from("fm_players")
      .update({
        stamina: newStamina,
        overall_rating: newOverall,
        pace: newPace,
        shooting: newShooting,
        passing: newPassing,
        dribbling: newDribbling,
        defending: newDefending,
        form: Math.min(100, p.form + 3)
      })
      .eq("id", p.id)
      .select("*")
      .single()

    if (updated) updatedList.push(updated)
    else updatedList.push({ ...p, stamina: newStamina, overall_rating: newOverall })
  }

  return updatedList
}

export async function fmRestSquad(clubId: number): Promise<FMPlayer[]> {
  const players = await fmGetClubPlayers(clubId)
  const updatedList: FMPlayer[] = []

  for (const p of players) {
    const { data: updated } = await supabase
      .from("fm_players")
      .update({
        stamina: 100,
        morale: Math.min(100, p.morale + 10),
        form: Math.min(100, p.form + 5)
      })
      .eq("id", p.id)
      .select("*")
      .single()

    if (updated) updatedList.push(updated)
    else updatedList.push({ ...p, stamina: 100, morale: 100 })
  }

  return updatedList
}

// ==========================================
// 4. TACTICS
// ==========================================

export async function fmGetTactics(clubId: number): Promise<FMTactics> {
  const defaultTactics: FMTactics = {
    club_id: clubId,
    formation: "4-4-2",
    mentality: "balanced",
    passing_style: "mixed",
    pressing: "normal",
    tackling: "normal"
  }

  try {
    const { data: tactics } = await supabase
      .from("fm_tactics")
      .select("*")
      .eq("club_id", clubId)
      .maybeSingle()

    return tactics || defaultTactics
  } catch {
    return defaultTactics
  }
}

export async function fmSaveTactics(clubId: number, tacticsData: Partial<FMTactics>): Promise<FMTactics> {
  const { data: updated } = await supabase
    .from("fm_tactics")
    .upsert({ club_id: clubId, ...tacticsData, updated_at: new Date().toISOString() }, { onConflict: "club_id" })
    .select("*")
    .single()

  return (
    updated || {
      club_id: clubId,
      formation: tacticsData.formation || "4-4-2",
      mentality: tacticsData.mentality || "balanced",
      passing_style: tacticsData.passing_style || "mixed",
      pressing: tacticsData.pressing || "normal",
      tackling: tacticsData.tackling || "normal"
    }
  )
}

// ==========================================
// 5. STADIUM & INFRASTRUCTURE
// ==========================================

export async function fmGetStadium(clubId: number): Promise<FMStadium> {
  const defaultStadium: FMStadium = {
    club_id: clubId,
    name: "Стадіон Арена",
    capacity: 5000,
    pitch_level: 1,
    training_level: 1,
    medical_level: 1,
    youth_academy_level: 1,
    marketing_level: 1,
    ticket_price: 15
  }

  try {
    const { data: stadium } = await supabase
      .from("fm_stadiums")
      .select("*")
      .eq("club_id", clubId)
      .maybeSingle()

    return stadium || defaultStadium
  } catch {
    return defaultStadium
  }
}

export async function fmUpgradeFacility(
  club: FMClub,
  stadium: FMStadium,
  facilityKey: keyof FMStadium,
  cost: number
): Promise<{ club: FMClub; stadium: FMStadium } | { error: string }> {
  if (club.balance < cost) {
    return { error: "Недостатньо коштів у бюджеті клубу для цього покращення" }
  }

  const newBalance = club.balance - cost
  let newFieldValue: number

  if (facilityKey === "capacity") {
    newFieldValue = stadium.capacity + 2500
  } else {
    newFieldValue = (Number(stadium[facilityKey]) || 1) + 1
  }

  // Update Club
  const { data: updatedClub } = await supabase
    .from("fm_clubs")
    .update({ balance: newBalance, reputation: club.reputation + 5 })
    .eq("id", club.id)
    .select("*")
    .single()

  // Update Stadium
  const { data: updatedStadium } = await supabase
    .from("fm_stadiums")
    .update({ [facilityKey]: newFieldValue, updated_at: new Date().toISOString() })
    .eq("club_id", club.id)
    .select("*")
    .single()

  return {
    club: updatedClub || { ...club, balance: newBalance, reputation: club.reputation + 5 },
    stadium: updatedStadium || { ...stadium, [facilityKey]: newFieldValue }
  }
}

export async function fmSetTicketPrice(clubId: number, price: number): Promise<FMStadium | null> {
  const { data: updated } = await supabase
    .from("fm_stadiums")
    .update({ ticket_price: price })
    .eq("club_id", clubId)
    .select("*")
    .single()

  return updated
}

// ==========================================
// 6. MATCHES & LEAGUES
// ==========================================

export async function fmGetOpponentClubs(excludeClubId: number): Promise<FMClub[]> {
  try {
    const { data: clubs } = await supabase
      .from("fm_clubs")
      .select("*")
      .neq("id", excludeClubId)
      .order("reputation", { ascending: false })

    return clubs || []
  } catch {
    return []
  }
}

export async function fmGetRecentMatches(clubId: number): Promise<FMMatch[]> {
  try {
    const { data: matches } = await supabase
      .from("fm_matches")
      .select("*")
      .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
      .order("created_at", { ascending: false })
      .limit(10)

    return matches || []
  } catch {
    return []
  }
}

export async function fmSaveCompletedMatch(
  simResult: SimulationResult,
  userClub: FMClub
): Promise<{ updatedClub: FMClub; savedMatch: FMMatch }> {
  const { match, updatedHomePlayers, homeRevenue, managerXpEarned } = simResult

  // 1. Save match record
  const { data: savedMatch } = await supabase
    .from("fm_matches")
    .insert([match])
    .select("*")
    .single()

  // 2. Update players stamina, goals, cards
  for (const p of updatedHomePlayers) {
    await supabase
      .from("fm_players")
      .update({
        stamina: p.stamina,
        morale: p.morale,
        form: p.form,
        matches_played: p.matches_played,
        goals: p.goals,
        assists: p.assists,
        yellow_cards: p.yellow_cards,
        red_cards: p.red_cards
      })
      .eq("id", p.id)
  }

  // 3. Update Club Balance & XP
  const newBalance = userClub.balance + homeRevenue
  const newXp = userClub.manager_xp + managerXpEarned
  const newLevel = Math.floor(newXp / 500) + 1

  const { data: updatedClub } = await supabase
    .from("fm_clubs")
    .update({
      balance: newBalance,
      manager_xp: newXp,
      manager_level: newLevel,
      reputation: userClub.reputation + (match.home_score > match.away_score ? 4 : match.home_score === match.away_score ? 1 : -1)
    })
    .eq("id", userClub.id)
    .select("*")
    .single()

  // 4. Update League Standings
  if (match.match_type === "league" && userClub.league_id) {
    const isHome = match.home_club_id === userClub.id
    const won = isHome ? match.home_score > match.away_score : match.away_score > match.home_score
    const draw = match.home_score === match.away_score
    const lost = !won && !draw
    const gf = isHome ? match.home_score : match.away_score
    const ga = isHome ? match.away_score : match.home_score
    const pts = won ? 3 : draw ? 1 : 0

    const { data: standing } = await supabase
      .from("fm_league_standings")
      .select("*")
      .eq("league_id", userClub.league_id)
      .eq("club_id", userClub.id)
      .maybeSingle()

    if (standing) {
      await supabase
        .from("fm_league_standings")
        .update({
          played: standing.played + 1,
          won: standing.won + (won ? 1 : 0),
          drawn: standing.drawn + (draw ? 1 : 0),
          lost: standing.lost + (lost ? 1 : 0),
          goals_for: standing.goals_for + gf,
          goals_against: standing.goals_against + ga,
          points: standing.points + pts,
          updated_at: new Date().toISOString()
        })
        .eq("id", standing.id)
    }
  }

  return {
    updatedClub: updatedClub || { ...userClub, balance: newBalance, manager_xp: newXp, manager_level: newLevel },
    savedMatch: savedMatch || match
  }
}

export async function fmGetLeagueStandings(leagueId = 1): Promise<FMLeagueStanding[]> {
  try {
    const { data: standings } = await supabase
      .from("fm_league_standings")
      .select("*")
      .eq("league_id", leagueId)
      .order("points", { ascending: false })
      .order("goals_for", { ascending: false })

    return standings || []
  } catch {
    return []
  }
}

// ==========================================
// 7. TRANSFERS
// ==========================================

export async function fmGetTransferMarket(): Promise<FMTransfer[]> {
  try {
    const { data: transfers } = await supabase
      .from("fm_transfers")
      .select("*")
      .eq("status", "active")
      .order("price", { ascending: false })

    return transfers || []
  } catch {
    return []
  }
}

export async function fmBuyPlayer(buyerClub: FMClub, transfer: FMTransfer): Promise<{ success: boolean; error?: string; updatedClub?: FMClub }> {
  if (buyerClub.balance < transfer.price) {
    return { success: false, error: "У вашому бюджеті недостатньо коштів для викупу гравця" }
  }

  try {
    // 1. Move player to buyer club
    await supabase
      .from("fm_players")
      .update({
        club_id: buyerClub.id,
        is_on_transfer: false,
        is_starter: false,
        pitch_slot: 0
      })
      .eq("id", transfer.player_id)

    // 2. Mark transfer completed
    await supabase
      .from("fm_transfers")
      .update({
        buyer_club_id: buyerClub.id,
        status: "completed"
      })
      .eq("id", transfer.id)

    // 3. Deduct money from buyer
    const newBuyerBalance = buyerClub.balance - transfer.price
    const { data: updatedClub } = await supabase
      .from("fm_clubs")
      .update({ balance: newBuyerBalance })
      .eq("id", buyerClub.id)
      .select("*")
      .single()

    // 4. Add money to seller if seller is not bot
    if (transfer.seller_club_id) {
      const { data: seller } = await supabase
        .from("fm_clubs")
        .select("balance")
        .eq("id", transfer.seller_club_id)
        .maybeSingle()

      if (seller) {
        await supabase
          .from("fm_clubs")
          .update({ balance: seller.balance + transfer.price })
          .eq("id", transfer.seller_club_id)
      }
    }

    return { success: true, updatedClub: updatedClub || { ...buyerClub, balance: newBuyerBalance } }
  } catch (err: any) {
    return { success: false, error: err.message || "Помилка здійснення трансферу" }
  }
}

export async function fmListPlayerOnMarket(player: FMPlayer, price: number): Promise<boolean> {
  try {
    await supabase
      .from("fm_players")
      .update({ is_on_transfer: true, transfer_price: price })
      .eq("id", player.id)

    await supabase.from("fm_transfers").insert([
      {
        player_id: player.id,
        player_name: player.name,
        position: player.position,
        rating: player.overall_rating,
        seller_club_id: player.club_id,
        price,
        status: "active"
      }
    ])

    return true
  } catch {
    return false
  }
}

// ==========================================
// 8. YOUTH ACADEMY
// ==========================================

export async function fmGetYouthProspects(clubId: number): Promise<FMYouthProspect[]> {
  try {
    const { data: prospects } = await supabase
      .from("fm_youth_prospects")
      .select("*")
      .eq("club_id", clubId)
      .eq("is_signed", false)
      .order("potential", { ascending: false })

    return prospects || []
  } catch {
    return []
  }
}

export async function fmScoutNewYouth(clubId: number, academyLevel = 1): Promise<FMYouthProspect[]> {
  const newProspects = [
    generateYouthProspect(clubId, academyLevel),
    generateYouthProspect(clubId, academyLevel),
    generateYouthProspect(clubId, academyLevel)
  ]

  const { data: created } = await supabase
    .from("fm_youth_prospects")
    .insert(newProspects)
    .select("*")

  return created || []
}

export async function fmSignYouthToFirstTeam(prospect: FMYouthProspect): Promise<FMPlayer | null> {
  try {
    // 1. Mark signed
    await supabase
      .from("fm_youth_prospects")
      .update({ is_signed: true })
      .eq("id", prospect.id)

    // 2. Create in fm_players
    const { data: newPlayer } = await supabase
      .from("fm_players")
      .insert([
        {
          club_id: prospect.club_id,
          name: prospect.name,
          nationality: "Україна",
          age: prospect.age,
          position: prospect.position,
          overall_rating: prospect.rating,
          pace: prospect.attributes.pace,
          shooting: prospect.attributes.shooting,
          passing: prospect.attributes.passing,
          dribbling: prospect.attributes.dribbling,
          defending: prospect.attributes.defending,
          physical: prospect.attributes.physical,
          goalkeeping: prospect.attributes.goalkeeping,
          stamina: 100,
          morale: 100,
          form: 80,
          potential: prospect.potential,
          market_value: prospect.rating * prospect.rating * 14,
          wage: Math.round(prospect.rating * 20),
          is_starter: false,
          pitch_slot: 0,
          is_on_transfer: false,
          transfer_price: 0,
          is_injured: false,
          injury_matches: 0
        }
      ])
      .select("*")
      .single()

    return newPlayer
  } catch {
    return null
  }
}
