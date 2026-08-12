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
  FMLeagueStanding,
  FMTournament,
  FMStaff,
  SpecialAbilityId,
  PlayerPosition
} from "./fm-types"
import { generateStarterSquad, generateYouthProspect, generateTournamentBracket } from "./fm-engine"

const CURRENT_USER_KEY = "ksliga_fm_current_user"
const CURRENT_CLUB_KEY = "ksliga_fm_current_club"

// ==========================================
// 1. AUTH & SESSION
// ==========================================

export async function fmRegisterUser(
  username: string,
  email: string,
  passwordHash: string
): Promise<{ user?: FMUser; error?: string }> {
  try {
    const { data: existing } = await supabase
      .from("fm_users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (existing) {
      return { error: "Користувач із таким Email вже зареєстрований" }
    }

    const { data, error } = await supabase
      .from("fm_users")
      .insert({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        is_verified: true
      })
      .select()
      .single()

    if (error) throw error

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data))
    }

    return { user: data }
  } catch (err: any) {
    console.error("fmRegisterUser error:", err)
    // Fallback for offline / mock resilience
    const mockUser: FMUser = {
      id: Date.now(),
      email: email.toLowerCase().trim(),
      username: username.trim(),
      password_hash: passwordHash,
      is_verified: true
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mockUser))
    }
    return { user: mockUser }
  }
}

export async function fmLoginUser(
  email: string,
  passwordHash: string
): Promise<{ user?: FMUser; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("fm_users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (error || !data) {
      return { error: "Користувача з таким Email не знайдено" }
    }

    if (data.password_hash !== passwordHash) {
      return { error: "Невірний пароль" }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data))
    }

    return { user: data }
  } catch (err: any) {
    console.error("fmLoginUser error:", err)
    return { error: "Помилка зв'язку із сервером авторизації" }
  }
}

export function fmGetStoredUser(): FMUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(CURRENT_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
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
// 2. CLUB LIFECYCLE
// ==========================================

export async function fmGetClubByUserId(userId: number): Promise<FMClub | null> {
  try {
    const { data, error } = await supabase
      .from("fm_clubs")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error || !data) return null

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_CLUB_KEY, JSON.stringify(data))
    }

    return data
  } catch (err) {
    console.error("fmGetClubByUserId error:", err)
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(CURRENT_CLUB_KEY)
      if (raw) return JSON.parse(raw)
    }
    return null
  }
}

export async function fmCreateClub(
  userId: number,
  name: string,
  city: string,
  primaryColor: string = "#0F5E10",
  secondaryColor: string = "#F59E0B",
  badgeSymbol: string = "shield"
): Promise<{ club?: FMClub; error?: string }> {
  try {
    const { data: defaultLeague } = await supabase
      .from("fm_leagues")
      .select("id")
      .limit(1)
      .single()

    const leagueId = defaultLeague?.id || 1

    const { data: club, error: clubErr } = await supabase
      .from("fm_clubs")
      .insert({
        user_id: userId,
        name: name.trim(),
        short_name: name.trim(),
        city: city.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        badge_symbol: badgeSymbol,
        balance: 300000,
        manager_level: 1,
        manager_xp: 0,
        reputation: 100,
        fans_count: 2000,
        league_id: leagueId,
        is_bot: false,
        cups_won: 0
      })
      .select()
      .single()

    if (clubErr) throw clubErr

    // Create Stadium / Football City
    await supabase.from("fm_stadiums").insert({
      club_id: club.id,
      name: `Арена ${club.name}`,
      capacity: 5000,
      pitch_level: 1,
      base_level: 1,
      fitness_level: 1,
      medical_level: 1,
      youth_academy_level: 1,
      office_level: 1,
      commercial_level: 1,
      ticket_price: 20
    })

    // Create Default Tactics
    await supabase.from("fm_tactics").insert({
      club_id: club.id,
      formation: "4-4-2",
      mentality: "balanced",
      passing_style: "mixed",
      pressing: "normal",
      tackling: "normal"
    })

    // Generate and Insert Starter Squad (16 players)
    const starterSquad = generateStarterSquad(club.id)
    await supabase.from("fm_players").insert(starterSquad)

    // Insert into League Standings
    await supabase.from("fm_league_standings").insert({
      league_id: leagueId,
      club_id: club.id,
      club_name: club.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      points: 0
    })

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_CLUB_KEY, JSON.stringify(club))
    }

    return { club }
  } catch (err: any) {
    console.error("fmCreateClub error:", err)
    return { error: "Не вдалося заснувати клуб. Спробуйте ще раз." }
  }
}

export async function fmUpdateClub(clubId: number, updates: Partial<FMClub>): Promise<FMClub | null> {
  try {
    const { data, error } = await supabase
      .from("fm_clubs")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", clubId)
      .select()
      .single()

    if (error) throw error

    if (typeof window !== "undefined" && data) {
      localStorage.setItem(CURRENT_CLUB_KEY, JSON.stringify(data))
    }

    return data
  } catch (err) {
    console.error("fmUpdateClub error:", err)
    return null
  }
}

// ==========================================
// 3. SQUAD & 11x11 PLAYERS
// ==========================================

export async function fmGetClubPlayers(clubId: number): Promise<FMPlayer[]> {
  try {
    const { data, error } = await supabase
      .from("fm_players")
      .select("*")
      .eq("club_id", clubId)
      .order("pitch_slot", { ascending: true })

    if (error) throw error

    // Map 11x11 properties with fallback
    return (data || []).map((p: any) => ({
      ...p,
      skill: p.skill || (p.overall_rating ? p.overall_rating * 3 : 150),
      talent: p.talent || 3,
      energy: p.energy ?? p.stamina ?? 100,
      morale: p.morale ?? 100,
      xp: p.xp ?? 0,
      special_abilities: Array.isArray(p.special_abilities) ? p.special_abilities : []
    }))
  } catch (err) {
    console.error("fmGetClubPlayers error:", err)
    return []
  }
}

export async function fmSaveSquadSlots(
  clubId: number,
  assignments: { playerId: number; isStarter: boolean; pitchSlot: number }[]
): Promise<boolean> {
  try {
    for (const a of assignments) {
      await supabase
        .from("fm_players")
        .update({
          is_starter: a.isStarter,
          pitch_slot: a.pitchSlot
        })
        .eq("id", a.playerId)
        .eq("club_id", clubId)
    }
    return true
  } catch (err) {
    console.error("fmSaveSquadSlots error:", err)
    return false
  }
}

export async function fmUpgradePlayerSkill(
  playerId: number,
  costXp: number,
  skillGain: number = 2
): Promise<boolean> {
  try {
    const { data: p } = await supabase.from("fm_players").select("skill, xp").eq("id", playerId).single()
    if (!p || (p.xp || 0) < costXp) return false

    const newSkill = (p.skill || 150) + skillGain
    const newXp = (p.xp || 0) - costXp

    const { error } = await supabase
      .from("fm_players")
      .update({ skill: newSkill, xp: newXp })
      .eq("id", playerId)

    return !error
  } catch (err) {
    console.error("fmUpgradePlayerSkill error:", err)
    return false
  }
}

export async function fmLearnPlayerSpecialAbility(
  playerId: number,
  abilityId: SpecialAbilityId,
  costXp: number,
  costMoney: number,
  clubId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: club } = await supabase.from("fm_clubs").select("balance").eq("id", clubId).single()
    if (!club || club.balance < costMoney) {
      return { success: false, error: "Недостатньо коштів у бюджеті клубу" }
    }

    const { data: p } = await supabase.from("fm_players").select("special_abilities, xp").eq("id", playerId).single()
    if (!p || (p.xp || 0) < costXp) {
      return { success: false, error: "У гравця недостатньо вільного XP" }
    }

    const currentAbilities: SpecialAbilityId[] = Array.isArray(p.special_abilities) ? p.special_abilities : []
    if (currentAbilities.includes(abilityId)) {
      return { success: false, error: "Гравець вже володіє цим спецумінням" }
    }

    const updatedAbilities = [...currentAbilities, abilityId]
    const newXp = (p.xp || 0) - costXp
    const newBalance = club.balance - costMoney

    await supabase.from("fm_players").update({ special_abilities: updatedAbilities, xp: newXp }).eq("id", playerId)
    await supabase.from("fm_clubs").update({ balance: newBalance }).eq("id", clubId)

    return { success: true }
  } catch (err: any) {
    console.error("fmLearnPlayerSpecialAbility error:", err)
    return { success: false, error: "Помилка при вивченні спецуміння" }
  }
}

export async function fmRestoreSquadEnergy(
  clubId: number,
  cost: number = 15000
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: club } = await supabase.from("fm_clubs").select("balance").eq("id", clubId).single()
    if (!club || club.balance < cost) {
      return { success: false, error: "Недостатньо коштів для процедур СПА" }
    }

    await supabase
      .from("fm_players")
      .update({ energy: 100, stamina: 100 })
      .eq("club_id", clubId)

    await supabase
      .from("fm_clubs")
      .update({ balance: club.balance - cost })
      .eq("id", clubId)

    return { success: true }
  } catch (err: any) {
    console.error("fmRestoreSquadEnergy error:", err)
    return { success: false, error: "Помилка при відновленні сил команди" }
  }
}

// ==========================================
// 4. TACTICS
// ==========================================

export async function fmGetTactics(clubId: number): Promise<FMTactics | null> {
  try {
    const { data, error } = await supabase
      .from("fm_tactics")
      .select("*")
      .eq("club_id", clubId)
      .single()

    if (error) return null
    return data
  } catch (err) {
    console.error("fmGetTactics error:", err)
    return null
  }
}

export async function fmSaveTactics(clubId: number, tactics: Partial<FMTactics>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("fm_tactics")
      .upsert({
        club_id: clubId,
        ...tactics,
        updated_at: new Date().toISOString()
      }, { onConflict: "club_id" })

    return !error
  } catch (err) {
    console.error("fmSaveTactics error:", err)
    return false
  }
}

// ==========================================
// 5. FOOTBALL CITY INFRASTRUCTURE & STAFF
// ==========================================

export async function fmGetStadium(clubId: number): Promise<FMStadium | null> {
  try {
    const { data, error } = await supabase
      .from("fm_stadiums")
      .select("*")
      .eq("club_id", clubId)
      .single()

    if (error) return null
    return data
  } catch (err) {
    console.error("fmGetStadium error:", err)
    return null
  }
}

export async function fmUpgradeCityBuilding(
  clubId: number,
  buildingId: string,
  cost: number
): Promise<{ success: boolean; stadium?: FMStadium; error?: string }> {
  try {
    const { data: club } = await supabase.from("fm_clubs").select("balance").eq("id", clubId).single()
    if (!club || club.balance < cost) {
      return { success: false, error: "Недостатньо коштів у скарбниці клубу" }
    }

    const { data: stadium } = await supabase.from("fm_stadiums").select("*").eq("club_id", clubId).single()
    if (!stadium) return { success: false, error: "Дані стадіону не знайдено" }

    const updates: any = { updated_at: new Date().toISOString() }

    if (buildingId === "stadium") updates.capacity = (stadium.capacity || 5000) + 5000
    else if (buildingId === "base") updates.base_level = (stadium.base_level || 1) + 1
    else if (buildingId === "fitness") updates.fitness_level = (stadium.fitness_level || 1) + 1
    else if (buildingId === "medical") updates.medical_level = (stadium.medical_level || 1) + 1
    else if (buildingId === "youth") updates.youth_academy_level = (stadium.youth_academy_level || 1) + 1
    else if (buildingId === "office") updates.office_level = (stadium.office_level || 1) + 1
    else if (buildingId === "commercial") updates.commercial_level = (stadium.commercial_level || 1) + 1

    const { data: updatedStadium, error: stErr } = await supabase
      .from("fm_stadiums")
      .update(updates)
      .eq("club_id", clubId)
      .select()
      .single()

    if (stErr) throw stErr

    await supabase.from("fm_clubs").update({ balance: club.balance - cost }).eq("id", clubId)

    return { success: true, stadium: updatedStadium }
  } catch (err: any) {
    console.error("fmUpgradeCityBuilding error:", err)
    return { success: false, error: "Помилка при оновленні споруди" }
  }
}

export async function fmSetTicketPrice(clubId: number, price: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("fm_stadiums")
      .update({ ticket_price: price, updated_at: new Date().toISOString() })
      .eq("club_id", clubId)

    return !error
  } catch (err) {
    console.error("fmSetTicketPrice error:", err)
    return false
  }
}

export async function fmGetStaff(clubId: number): Promise<FMStaff[]> {
  try {
    const { data, error } = await supabase
      .from("fm_staff")
      .select("*")
      .eq("club_id", clubId)

    if (error) return []
    return data || []
  } catch (err) {
    console.error("fmGetStaff error:", err)
    return []
  }
}

export async function fmHireStaff(
  clubId: number,
  role: "coach" | "doctor" | "masseur" | "scout",
  name: string,
  level: number,
  salary: number,
  bonusDesc: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("fm_staff").insert({
      club_id: clubId,
      role,
      name,
      level,
      salary,
      bonus_desc: bonusDesc
    })
    return !error
  } catch (err) {
    console.error("fmHireStaff error:", err)
    return false
  }
}

export async function fmFireStaff(staffId: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("fm_staff").delete().eq("id", staffId)
    return !error
  } catch (err) {
    console.error("fmFireStaff error:", err)
    return false
  }
}

// ==========================================
// 6. 11x11 TOURNAMENTS (CUP KNOCKOUTS)
// ==========================================

export async function fmGetActiveTournaments(): Promise<FMTournament[]> {
  try {
    const { data, error } = await supabase
      .from("fm_tournaments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6)

    if (error) return []
    return data || []
  } catch (err) {
    console.error("fmGetActiveTournaments error:", err)
    return []
  }
}

export async function fmCreateTournament(
  name: string,
  userClub: { id: number; name: string; badge?: string; color?: string },
  botClubs: { id: number; name: string; badge?: string; color?: string }[],
  entryFee: number = 5000,
  prizePool: number = 50000
): Promise<FMTournament | null> {
  try {
    const bracket = generateTournamentBracket(userClub, botClubs)

    const { data, error } = await supabase
      .from("fm_tournaments")
      .insert({
        name,
        tier: 1,
        status: "quarter_finals",
        bracket,
        prize_pool: prizePool,
        entry_fee: entryFee
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error("fmCreateTournament error:", err)
    return null
  }
}

export async function fmUpdateTournament(
  tournamentId: number,
  bracket: any,
  status: string,
  winnerClubId?: number | null,
  winnerClubName?: string | null
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("fm_tournaments")
      .update({
        bracket,
        status,
        winner_club_id: winnerClubId || null,
        winner_club_name: winnerClubName || null
      })
      .eq("id", tournamentId)

    return !error
  } catch (err) {
    console.error("fmUpdateTournament error:", err)
    return false
  }
}

// ==========================================
// 7. MATCH RECORDING & REWARDS
// ==========================================

export async function fmSaveCompletedMatch(
  match: FMMatch,
  fatigueDrains: { id: number; newEnergy: number; xpGained: number }[],
  userClubId: number
): Promise<boolean> {
  try {
    // 1. Insert match log
    await supabase.from("fm_matches").insert({
      home_club_id: match.home_club_id,
      away_club_id: match.away_club_id,
      home_club_name: match.home_club_name,
      away_club_name: match.away_club_name,
      home_score: match.home_score,
      away_score: match.away_score,
      is_played: true,
      match_type: match.match_type,
      tournament_id: match.tournament_id || null,
      events_log: match.events_log,
      stats: match.stats,
      revenue: match.revenue,
      xp_reward: match.xp_reward,
      played_at: new Date().toISOString()
    })

    // 2. Update players energy & xp
    for (const f of fatigueDrains) {
      const { data: p } = await supabase.from("fm_players").select("xp").eq("id", f.id).single()
      const newTotalXp = (p?.xp || 0) + f.xpGained
      await supabase
        .from("fm_players")
        .update({ energy: f.newEnergy, stamina: f.newEnergy, xp: newTotalXp })
        .eq("id", f.id)
    }

    // 3. Update club balance & manager XP
    const { data: club } = await supabase.from("fm_clubs").select("balance, manager_xp, manager_level").eq("id", userClubId).single()
    if (club) {
      const newBalance = club.balance + match.revenue
      const newXp = club.manager_xp + match.xp_reward
      const newLevel = Math.floor(newXp / 500) + 1

      await supabase
        .from("fm_clubs")
        .update({
          balance: newBalance,
          manager_xp: newXp,
          manager_level: newLevel
        })
        .eq("id", userClubId)
    }

    return true
  } catch (err) {
    console.error("fmSaveCompletedMatch error:", err)
    return false
  }
}

// ==========================================
// 8. 11x11 AUCTION TRANSFER MARKET
// ==========================================

export async function fmGetTransferMarket(): Promise<FMTransfer[]> {
  try {
    const { data, error } = await supabase
      .from("fm_transfers")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) return []

    return (data || []).map((t: any) => ({
      ...t,
      skill: t.skill || (t.rating ? t.rating * 3 : 180),
      talent: t.talent || 3,
      special_abilities: Array.isArray(t.special_abilities) ? t.special_abilities : [],
      current_bid: t.current_bid || t.price || 50000,
      buyout_price: t.buyout_price || Math.round((t.price || 50000) * 1.5),
      ends_at: t.ends_at || new Date(Date.now() + 3600000).toISOString()
    }))
  } catch (err) {
    console.error("fmGetTransferMarket error:", err)
    return []
  }
}

export async function fmPlaceTransferBid(
  transferId: number,
  bidderClubId: number,
  bidderClubName: string,
  bidAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: club } = await supabase.from("fm_clubs").select("balance").eq("id", bidderClubId).single()
    if (!club || club.balance < bidAmount) {
      return { success: false, error: "Недостатньо коштів у бюджеті для такої ставки" }
    }

    const { data: t } = await supabase.from("fm_transfers").select("current_bid, buyout_price").eq("id", transferId).single()
    if (!t || bidAmount <= t.current_bid) {
      return { success: false, error: "Ставка повинна перевищувати поточну" }
    }

    if (bidAmount >= t.buyout_price) {
      return fmBuyoutTransfer(transferId, bidderClubId)
    }

    const { error } = await supabase
      .from("fm_transfers")
      .update({
        current_bid: bidAmount,
        highest_bidder_club_id: bidderClubId,
        highest_bidder_club_name: bidderClubName
      })
      .eq("id", transferId)

    return { success: !error }
  } catch (err: any) {
    console.error("fmPlaceTransferBid error:", err)
    return { success: false, error: "Помилка при розміщенні ставки на аукціоні" }
  }
}

export async function fmBuyoutTransfer(
  transferId: number,
  buyerClubId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: t, error: tErr } = await supabase.from("fm_transfers").select("*").eq("id", transferId).single()
    if (tErr || !t) return { success: false, error: "Трансфер не знайдено або вже закритий" }

    const price = t.buyout_price || t.current_bid || t.price || 60000

    const { data: buyer } = await supabase.from("fm_clubs").select("balance").eq("id", buyerClubId).single()
    if (!buyer || buyer.balance < price) {
      return { success: false, error: "Недостатньо коштів для викупу гравця" }
    }

    // Transfer ownership of player
    await supabase
      .from("fm_players")
      .update({
        club_id: buyerClubId,
        is_on_transfer: false,
        is_starter: false,
        pitch_slot: 0
      })
      .eq("id", t.player_id)

    // Deduct buyer money
    await supabase.from("fm_clubs").update({ balance: buyer.balance - price }).eq("id", buyerClubId)

    // Credit seller money
    if (t.seller_club_id && t.seller_club_id !== buyerClubId) {
      const { data: seller } = await supabase.from("fm_clubs").select("balance").eq("id", t.seller_club_id).single()
      if (seller) {
        await supabase.from("fm_clubs").update({ balance: seller.balance + price }).eq("id", t.seller_club_id)
      }
    }

    // Mark transfer completed
    await supabase
      .from("fm_transfers")
      .update({
        status: "completed",
        buyer_club_id: buyerClubId,
        highest_bidder_club_id: buyerClubId
      })
      .eq("id", transferId)

    return { success: true }
  } catch (err: any) {
    console.error("fmBuyoutTransfer error:", err)
    return { success: false, error: "Помилка при викупі гравця" }
  }
}

export async function fmListPlayerOnMarket(
  playerId: number,
  initialBid: number,
  buyoutPrice: number,
  sellerClubId: number,
  sellerClubName: string
): Promise<boolean> {
  try {
    const { data: p } = await supabase.from("fm_players").select("*").eq("id", playerId).single()
    if (!p) return false

    await supabase.from("fm_transfers").insert({
      player_id: playerId,
      player_name: p.name,
      position: p.position,
      skill: p.skill || (p.overall_rating ? p.overall_rating * 3 : 150),
      talent: p.talent || 3,
      special_abilities: Array.isArray(p.special_abilities) ? p.special_abilities : [],
      seller_club_id: sellerClubId,
      seller_club_name: sellerClubName,
      price: initialBid,
      current_bid: initialBid,
      buyout_price: buyoutPrice,
      status: "active",
      ends_at: new Date(Date.now() + 3600000).toISOString()
    })

    await supabase.from("fm_players").update({ is_on_transfer: true, transfer_price: buyoutPrice }).eq("id", playerId)

    return true
  } catch (err) {
    console.error("fmListPlayerOnMarket error:", err)
    return false
  }
}

// ==========================================
// 9. YOUTH ACADEMY (11x11 STYLE)
// ==========================================

export async function fmGetYouthProspects(clubId: number): Promise<FMYouthProspect[]> {
  try {
    const { data, error } = await supabase
      .from("fm_youth_prospects")
      .select("*")
      .eq("club_id", clubId)
      .eq("is_signed", false)
      .order("scouted_at", { ascending: false })

    if (error) return []

    return (data || []).map((yp: any) => ({
      ...yp,
      skill: yp.skill || (yp.rating ? yp.rating * 2.5 : 120),
      talent: yp.talent || (yp.potential ? Math.min(6, Math.max(1, Math.round(yp.potential / 16))) : 3),
      special_abilities: Array.isArray(yp.special_abilities) ? yp.special_abilities : [],
      signing_cost: yp.signing_cost || 15000
    }))
  } catch (err) {
    console.error("fmGetYouthProspects error:", err)
    return []
  }
}

export async function fmScoutNewYouth(clubId: number, academyLevel: number = 1): Promise<FMYouthProspect[]> {
  try {
    const newProspects: FMYouthProspect[] = [
      generateYouthProspect(clubId, academyLevel),
      generateYouthProspect(clubId, academyLevel),
      generateYouthProspect(clubId, academyLevel)
    ]

    for (const p of newProspects) {
      await supabase.from("fm_youth_prospects").insert({
        club_id: clubId,
        name: p.name,
        age: p.age,
        position: p.position,
        skill: p.skill,
        talent: p.talent,
        special_abilities: p.special_abilities,
        signing_cost: p.signing_cost,
        is_signed: false
      })
    }

    return newProspects
  } catch (err) {
    console.error("fmScoutNewYouth error:", err)
    return []
  }
}

export async function fmSignYouthToFirstTeam(
  prospectId: number,
  clubId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: prospect } = await supabase.from("fm_youth_prospects").select("*").eq("id", prospectId).single()
    if (!prospect || prospect.is_signed) return { success: false, error: "Юніора не знайдено або вже підписано" }

    const cost = prospect.signing_cost || 15000
    const { data: club } = await supabase.from("fm_clubs").select("balance").eq("id", clubId).single()
    if (!club || club.balance < cost) return { success: false, error: "Недостатньо коштів для підписання юніора" }

    // Insert into first team squad
    await supabase.from("fm_players").insert({
      club_id: clubId,
      name: prospect.name,
      nationality: "Україна",
      age: prospect.age,
      position: prospect.position,
      skill: prospect.skill || 140,
      talent: prospect.talent || 3,
      special_abilities: Array.isArray(prospect.special_abilities) ? prospect.special_abilities : [],
      energy: 100,
      morale: 100,
      xp: 25,
      market_value: (prospect.skill || 140) * (prospect.talent || 3) * 500,
      wage: (prospect.skill || 140) * 6,
      matches_played: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
      is_starter: false,
      pitch_slot: 0,
      is_on_transfer: false,
      transfer_price: 0,
      is_injured: false,
      injury_matches: 0
    })

    // Deduct cost
    await supabase.from("fm_clubs").update({ balance: club.balance - cost }).eq("id", clubId)

    // Mark signed
    await supabase.from("fm_youth_prospects").update({ is_signed: true }).eq("id", prospectId)

    return { success: true }
  } catch (err: any) {
    console.error("fmSignYouthToFirstTeam error:", err)
    return { success: false, error: "Помилка при оформленні контракту" }
  }
}

// ==========================================
// 10. LEAGUE STANDINGS & OPPONENTS
// ==========================================

export async function fmGetLeagueStandings(leagueId: number = 1): Promise<FMLeagueStanding[]> {
  try {
    const { data, error } = await supabase
      .from("fm_league_standings")
      .select("*")
      .order("points", { ascending: false })
      .order("goals_for", { ascending: false })

    if (error) return []
    return data || []
  } catch (err) {
    console.error("fmGetLeagueStandings error:", err)
    return []
  }
}

export async function fmGetOpponentClubs(excludeClubId: number): Promise<FMClub[]> {
  try {
    const { data, error } = await supabase
      .from("fm_clubs")
      .select("*")
      .neq("id", excludeClubId)
      .limit(10)

    if (error) return []
    return data || []
  } catch (err) {
    console.error("fmGetOpponentClubs error:", err)
    return []
  }
}

export async function fmGetRecentMatches(clubId: number): Promise<FMMatch[]> {
  try {
    const { data, error } = await supabase
      .from("fm_matches")
      .select("*")
      .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
      .order("played_at", { ascending: false })
      .limit(8)

    if (error) return []
    return data || []
  } catch (err) {
    console.error("fmGetRecentMatches error:", err)
    return []
  }
}
