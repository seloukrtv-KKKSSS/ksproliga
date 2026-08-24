import { isSupabaseConfigured, supabase } from "./supabase"
import type { Championship, Team, Match, Player, MatchGoal, MatchCard, MatchVoting, VotingCandidate, Organizer, Product, UserAnalytics, OrganizerLog, GameScore } from "./supabase"
import { buildLeagueTable, sortChampionships } from "./league-utils"
export { buildLeagueTable, formatTime, getMatchStatusInfo, sortChampionships } from "./league-utils"
export type { LeagueStanding } from "./league-utils"


// Mock data for demo purposes
const mockChampionships: Championship[] = [
  {
    id: 1,
    name: "KS Liga",
    season: "2024-2025",
    is_active: true,
    tournament_type: "league",
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Кубок KS Liga",
    season: "2024-2025",
    is_active: false,
    tournament_type: "cup",
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
]

const mockTeams: Team[] = [
  {
    id: 1,
    name: "Динамо Київ",
    logo: "/placeholder.svg?height=32&width=32",
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Шахтар Донецк",
    logo: "/placeholder.svg?height=32&width=32",
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Дніпро-1",
    logo: "/placeholder.svg?height=32&width=32",
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: "Ворскла Полтава",
    logo: "/placeholder.svg?height=32&width=32",
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
]

const mockMatches: Match[] = [
  {
    id: 1,
    round: 1,
    date: "2024-08-15",
    home_team: "Динамо Київ",
    away_team: "Шахтар Донецк",
    home_score: 2,
    away_score: 1,
    is_finished: true,
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    round: 1,
    date: "2024-08-15",
    home_team: "Дніпро-1",
    away_team: "Ворскла Полтава",
    home_score: 0,
    away_score: 0,
    is_finished: true,
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    round: 2,
    date: "2024-08-22",
    home_team: "Шахтар Донецк",
    away_team: "Дніпро-1",
    home_score: null,
    away_score: null,
    is_finished: false,
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
]

const mockPlayers: Player[] = [
  {
    id: 1,
    name: "Андрій Ярмоленко",
    team: "Динамо Київ",
    goals: 5,
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Георгій Судаков",
    team: "Шахтар Донецк",
    goals: 3,
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Олександр Пихаленок",
    team: "Дніпро-1",
    goals: 2,
    championship_id: 1,
    created_at: new Date().toISOString(),
  },
]

const mockMatchVotings: MatchVoting[] = []
const mockVotingCandidates: VotingCandidate[] = []
const mockOrganizers: Organizer[] = []


// Helper function to check if we should use mock data
const shouldUseMockData = () => !isSupabaseConfigured

// Championships
export async function getChampionships(): Promise<Championship[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(sortChampionships(mockChampionships))
  }

  try {
    const { data, error } = await supabase
      .from("championships")
      .select("id,name,season,is_active,tournament_type,sort_order,created_at")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
    if (error) throw error
    return sortChampionships(data || [])
  } catch (error) {
    console.warn("Database error, using mock data:", error)
    return sortChampionships(mockChampionships)
  }
}

export async function getActiveChampionship(): Promise<Championship | null> {
  if (shouldUseMockData()) {
    return Promise.resolve(mockChampionships.find((c) => c.is_active) || null)
  }

  try {
    const { data, error } = await supabase
      .from("championships")
      .select("id,name,season,is_active,tournament_type,sort_order,created_at")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  } catch (error) {
    console.warn("Database error, using mock data:", error)
    return mockChampionships.find((c) => c.is_active) || null
  }
}

export async function addChampionship(championship: Omit<Championship, "id" | "created_at">): Promise<Championship> {
  if (shouldUseMockData()) {
    const newChampionship = {
      ...championship,
      id: Math.max(...mockChampionships.map((c) => c.id)) + 1,
      created_at: new Date().toISOString(),
    }
    mockChampionships.push(newChampionship)
    return Promise.resolve(newChampionship)
  }

  const { data, error } = await supabase.from("championships").insert([championship]).select().single()
  if (error) throw error
  return data
}

export async function updateChampionship(id: number, updates: Partial<Championship>): Promise<Championship> {
  if (shouldUseMockData()) {
    const index = mockChampionships.findIndex((c) => c.id === id)
    if (index !== -1) {
      mockChampionships[index] = { ...mockChampionships[index], ...updates }
      return Promise.resolve(mockChampionships[index])
    }
    throw new Error("Championship not found")
  }

  const { data, error } = await supabase.from("championships").update(updates).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteChampionship(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const index = mockChampionships.findIndex((c) => c.id === id)
    if (index !== -1) {
      mockChampionships.splice(index, 1)
    }
    return Promise.resolve()
  }

  const { error } = await supabase.from("championships").delete().eq("id", id)
  if (error) throw error
}

export async function updateChampionshipsOrder(orderedChampionships: Championship[]): Promise<void> {
  const updatedList = orderedChampionships.map((c, index) => ({
    ...c,
    sort_order: index + 1,
  }))

  if (shouldUseMockData()) {
    updatedList.forEach((item) => {
      const idx = mockChampionships.findIndex((c) => c.id === item.id)
      if (idx !== -1) {
        mockChampionships[idx].sort_order = item.sort_order
      }
    })
    return Promise.resolve()
  }

  try {
    const updates = updatedList.map((item) =>
      supabase.from("championships").update({ sort_order: item.sort_order }).eq("id", item.id)
    )
    await Promise.all(updates)
  } catch (error) {
    console.error("Error updating championships order in Supabase:", error)
  }
}

// Organizers & Supabase Auth
export type OrganizerInput = Pick<Organizer, "name" | "email" | "championship_ids">

const ORGANIZER_PROFILE_COLUMNS =
  "user_id,name,email,role,championship_ids,is_active,last_login_at,created_at,updated_at"

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return "Не вдалося виконати операцію авторизації"
}

export async function getCurrentOrganizerProfile(): Promise<Organizer | null> {
  if (shouldUseMockData()) return null

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return null

  const { data, error } = await supabase
    .from("organizer_profiles")
    .select(ORGANIZER_PROFILE_COLUMNS)
    .eq("user_id", userData.user.id)
    .maybeSingle()

  if (error) throw error
  if (!data?.is_active) return null
  return data as Organizer
}

export async function getOrganizers(): Promise<Organizer[]> {
  if (shouldUseMockData()) return Promise.resolve([...mockOrganizers])

  const { data, error } = await supabase
    .from("organizer_profiles")
    .select(ORGANIZER_PROFILE_COLUMNS)
    .eq("role", "organizer")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as Organizer[]
}

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body })
  if (error) {
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const payload = await context.clone().json()
        if (payload?.error) throw new Error(payload.error)
      } catch (contextError) {
        if (contextError instanceof Error && contextError.message !== "Unexpected end of JSON input") {
          throw contextError
        }
      }
    }
    throw new Error(getAuthErrorMessage(error))
  }
  if (!data?.success) throw new Error(data?.error || "Операцію з організатором не виконано")
  return data.profile as T
}

export async function addOrganizer(organizer: OrganizerInput): Promise<Organizer> {
  if (shouldUseMockData()) throw new Error("Supabase Auth не налаштовано")
  return invokeAdminUsers<Organizer>({ action: "invite", organizer })
}

export async function updateOrganizer(
  userId: string,
  updates: OrganizerInput,
): Promise<Organizer> {
  if (shouldUseMockData()) throw new Error("Supabase Auth не налаштовано")
  return invokeAdminUsers<Organizer>({ action: "update", userId, organizer: updates })
}

export async function deleteOrganizer(userId: string): Promise<void> {
  if (shouldUseMockData()) return
  await invokeAdminUsers<Organizer>({ action: "delete", userId })
}

export async function authenticateUser(email: string, password: string): Promise<Organizer> {
  if (shouldUseMockData()) throw new Error("Supabase Auth не налаштовано")

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw error

  const profile = await getCurrentOrganizerProfile()
  if (!profile) {
    await supabase.auth.signOut()
    throw new Error("Обліковий запис не має активного доступу до адмін-панелі")
  }

  const { error: touchError } = await supabase.rpc("touch_organizer_login")
  if (touchError) console.warn("Could not update organizer last login:", touchError)

  return { ...profile, last_login_at: new Date().toISOString() }
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (shouldUseMockData()) throw new Error("Supabase Auth не налаштовано")
  const redirectTo = typeof window === "undefined"
    ? "https://ksliga.com/auth/update-password"
    : `${window.location.origin}/auth/update-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
  if (error) throw error
}

export async function updateCurrentPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

// Products (KS Shop)
const mockProducts: Product[] = [
  {
    id: 1,
    title: 'Офіційний М"яч KS LIGA Pro 2025',
    description: 'Професійний футбольний м"яч із термосклеєними панелями та сертифікатом FIFA Quality Pro. Чудове зчеплення з полем за будь-якої погоди.',
    price: 1490,
    old_price: 1800,
    images: [
      'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
    ],
    badge: 'ХІТ',
    instagram_url: 'https://www.instagram.com/ks_fan.shop/',
    is_available: true,
    is_official: true,
    is_approved: true,
    author_name: 'KS LIGA',
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Ігрова Форма KS LIGA Official Kit',
    description: 'Легка дихальна техніка тканини з технологією Dri-FIT. Сучасний ергономічний крій, стійкість до багаторазового прання.',
    price: 1250,
    old_price: 1500,
    images: [
      'https://images.unsplash.com/photo-1580086319619-3ed498161c77?w=800&auto=format&fit=crop&q=80',
    ],
    badge: 'НОВИНКА',
    instagram_url: 'https://www.instagram.com/ks_fan.shop/',
    is_available: true,
    is_official: true,
    is_approved: true,
    author_name: 'KS LIGA',
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Фірмове Худі KS LIGA Black Edition',
    description: 'Тепле та стильне худі з високоякісної бавовни з флісовим утепленням. Об"ємний капюшон та фірмова вишивка логотипу.',
    price: 1650,
    old_price: null,
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    ],
    badge: 'ТОП',
    instagram_url: 'https://www.instagram.com/ks_fan.shop/',
    is_available: true,
    is_official: true,
    is_approved: true,
    author_name: 'KS LIGA',
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
]

export async function getProducts(): Promise<Product[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(
      [...mockProducts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    )
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,title,description,price,old_price,images,badge,instagram_url,is_available,sort_order,is_official,is_approved,author_name,author_user_id,created_at")
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("Error fetching products:", error)
    return mockProducts
  }

  return data && data.length > 0 ? data : mockProducts
}

export async function addProduct(
  product: Omit<Product, "id" | "created_at">
): Promise<Product> {
  if (shouldUseMockData()) {
    const newProduct: Product = {
      ...product,
      id: Date.now(),
      created_at: new Date().toISOString(),
    }
    mockProducts.push(newProduct)
    return Promise.resolve(newProduct)
  }

  const payload = { ...product }
  if (payload.is_official === false && !payload.author_user_id) {
    const { data: userData } = await supabase.auth.getUser()
    payload.author_user_id = userData.user?.id ?? null
  }

  const { data, error } = await supabase.from("products").insert([payload]).select().single()
  if (error) throw error
  return data
}

export async function updateProduct(
  id: number,
  updates: Partial<Omit<Product, "id" | "created_at">>
): Promise<Product> {
  if (shouldUseMockData()) {
    const index = mockProducts.findIndex((p) => p.id === id)
    if (index !== -1) {
      mockProducts[index] = { ...mockProducts[index], ...updates }
      return Promise.resolve(mockProducts[index])
    }
    throw new Error("Product not found")
  }

  const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const index = mockProducts.findIndex((p) => p.id === id)
    if (index !== -1) {
      mockProducts.splice(index, 1)
    }
    return Promise.resolve()
  }

  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) throw error
}

export async function approveProduct(id: number): Promise<Product> {
  return updateProduct(id, { is_approved: true })
}

// Teams
export async function addTeam(team: Omit<Team, "id" | "created_at">): Promise<Team> {
  if (shouldUseMockData()) {
    const newTeam = {
      ...team,
      id: Math.max(...mockTeams.map((t) => t.id), 0) + 1,
      created_at: new Date().toISOString(),
    }
    mockTeams.push(newTeam)
    return Promise.resolve(newTeam)
  }

  try {
    const { data, error } = await supabase.from("teams").insert([team]).select().single()
    if (error) throw error
    return data
  } catch (error: any) {
    if (error?.message?.includes("roster") || error?.code === "PGRST204") {
      const { roster, ...cleanTeam } = team
      const { data, error: err2 } = await supabase.from("teams").insert([cleanTeam]).select().single()
      if (err2) throw err2
      return { ...data, roster }
    }
    throw error
  }
}

export async function getTeams(championshipId?: number): Promise<Team[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(championshipId ? mockTeams.filter((t) => t.championship_id === championshipId) : mockTeams)
  }

  try {
    let query = supabase
      .from("teams")
      .select("id,name,logo,city,roster,championship_id,created_at")
      .order("name")
    if (championshipId) {
      query = query.eq("championship_id", championshipId)
    }
    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error, using mock data:", error)
    return championshipId ? mockTeams.filter((t) => t.championship_id === championshipId) : mockTeams
  }
}

export async function getTeamById(id: number): Promise<Team | null> {
  if (shouldUseMockData()) {
    return Promise.resolve(mockTeams.find((team) => team.id === id) || null)
  }

  try {
    const { data, error } = await supabase
      .from("teams")
      .select("id,name,logo,city,roster,championship_id,created_at")
      .eq("id", id)
      .maybeSingle()

    if (error) throw error
    return data || null
  } catch (error) {
    console.warn("Database error getting team by id:", error)
    return mockTeams.find((team) => team.id === id) || null
  }
}

export async function updateTeam(id: number, updates: Partial<Team>, oldNameOverride?: string): Promise<Team> {
  if (shouldUseMockData()) {
    const index = mockTeams.findIndex((t) => t.id === id)
    if (index !== -1) {
      const oldTeam = mockTeams[index]
      const oldName = (oldNameOverride || oldTeam.name)?.trim()
      const newName = updates.name?.trim()
      mockTeams[index] = { ...mockTeams[index], ...updates }

      if (newName && oldName && newName !== oldName) {
        // Cascade to mockMatches
        mockMatches.forEach((m) => {
          if (!oldTeam.championship_id || m.championship_id === oldTeam.championship_id) {
            if (m.home_team?.trim() === oldName) m.home_team = newName
            if (m.away_team?.trim() === oldName) m.away_team = newName
            if (m.technical_winner?.trim() === oldName) m.technical_winner = newName
            if (m.penalty_winner?.trim() === oldName) m.penalty_winner = newName
          }
        })
        // Cascade to mockPlayers
        mockPlayers.forEach((p) => {
          if (!oldTeam.championship_id || p.championship_id === oldTeam.championship_id) {
            if (p.team?.trim() === oldName) p.team = newName
          }
        })
      }
      return Promise.resolve(mockTeams[index])
    }
    throw new Error("Team not found")
  }

  try {
    // 1. Fetch current team before update to get previous name & championship
    let oldName = oldNameOverride?.trim()
    let champId: number | undefined = updates.championship_id

    if (!oldName) {
      const { data: currentTeam } = await supabase
        .from("teams")
        .select("name, championship_id")
        .eq("id", id)
        .maybeSingle()
      if (currentTeam) {
        oldName = currentTeam.name?.trim()
        if (!champId) champId = currentTeam.championship_id
      }
    }

    // 2. Perform the update on teams table
    let updatedTeam: Team
    try {
      const { data, error } = await supabase.from("teams").update(updates).eq("id", id).select().single()
      if (error) throw error
      updatedTeam = data
    } catch (error: any) {
      if (error?.message?.includes("roster") || error?.code === "PGRST204") {
        const { roster, ...cleanUpdates } = updates
        const { data, error: err2 } = await supabase.from("teams").update(cleanUpdates).eq("id", id).select().single()
        if (err2) throw err2
        updatedTeam = { ...data, roster }
      } else {
        throw error
      }
    }

    // 3. If team name changed, CASCADE update all match and player references!
    const newName = updates.name?.trim()
    if (newName && oldName && newName !== oldName) {
      const cleanOldName = oldName
      try {
        if (champId) {
          await Promise.all([
            supabase.from("matches").update({ home_team: newName }).eq("championship_id", champId).eq("home_team", cleanOldName),
            supabase.from("matches").update({ away_team: newName }).eq("championship_id", champId).eq("away_team", cleanOldName),
            supabase.from("matches").update({ technical_winner: newName }).eq("championship_id", champId).eq("technical_winner", cleanOldName),
            supabase.from("matches").update({ penalty_winner: newName }).eq("championship_id", champId).eq("penalty_winner", cleanOldName),
            supabase.from("players").update({ team: newName }).eq("championship_id", champId).eq("team", cleanOldName),
            supabase.from("match_goals").update({ team_name: newName }).eq("team_name", cleanOldName),
            supabase.from("match_cards").update({ team_name: newName }).eq("team_name", cleanOldName),
            supabase.from("voting_candidates").update({ team_name: newName }).eq("team_name", cleanOldName),
          ])
        } else {
          await Promise.all([
            supabase.from("matches").update({ home_team: newName }).eq("home_team", cleanOldName),
            supabase.from("matches").update({ away_team: newName }).eq("away_team", cleanOldName),
            supabase.from("matches").update({ technical_winner: newName }).eq("technical_winner", cleanOldName),
            supabase.from("matches").update({ penalty_winner: newName }).eq("penalty_winner", cleanOldName),
            supabase.from("players").update({ team: newName }).eq("team", cleanOldName),
            supabase.from("match_goals").update({ team_name: newName }).eq("team_name", cleanOldName),
            supabase.from("match_cards").update({ team_name: newName }).eq("team_name", cleanOldName),
            supabase.from("voting_candidates").update({ team_name: newName }).eq("team_name", cleanOldName),
          ])
        }
      } catch (cascadeError) {
        console.warn("Cascade team update notice:", cascadeError)
      }
    }

    return updatedTeam
  } catch (error) {
    console.error("Error in updateTeam:", error)
    throw error
  }
}

export async function deleteTeam(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const index = mockTeams.findIndex((t) => t.id === id)
    if (index !== -1) {
      mockTeams.splice(index, 1)
    }
    return Promise.resolve()
  }

  const { error } = await supabase.from("teams").delete().eq("id", id)
  if (error) throw error
}

// Matches
export async function getMatches(championshipId?: number): Promise<Match[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(
      championshipId ? mockMatches.filter((m) => m.championship_id === championshipId) : mockMatches,
    )
  }

  try {
    let query = supabase
      .from("matches")
      .select("id,round,date,home_team,away_team,home_score,away_score,is_finished,championship_id,match_time,cup_stage,is_technical_defeat,technical_winner,penalty_home,penalty_away,penalty_winner,created_at")
      .order("round", { ascending: true })
      .order("date", { ascending: true })

    if (championshipId) {
      query = query.eq("championship_id", championshipId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error, using mock data:", error)
    return championshipId ? mockMatches.filter((m) => m.championship_id === championshipId) : mockMatches
  }
}

export async function getMatchById(id: number): Promise<Match | null> {
  if (shouldUseMockData()) {
    return Promise.resolve(mockMatches.find((m) => m.id === id) || null)
  }

  try {
    const { data, error } = await supabase
      .from("matches")
      .select("id,round,date,home_team,away_team,home_score,away_score,is_finished,championship_id,match_time,cup_stage,is_technical_defeat,technical_winner,penalty_home,penalty_away,penalty_winner,created_at")
      .eq("id", id)
      .maybeSingle()

    if (error) throw error
    return data || null
  } catch (error) {
    console.warn("Database error getting match by id:", error)
    return mockMatches.find((m) => m.id === id) || null
  }
}

export async function getMatchesForTeam(teamName: string, championshipId: number): Promise<Match[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(
      mockMatches.filter(
        (match) =>
          match.championship_id === championshipId &&
          (match.home_team === teamName || match.away_team === teamName),
      ),
    )
  }

  try {
    const safeTeamName = teamName.replaceAll(",", "\\,")
    const { data, error } = await supabase
      .from("matches")
      .select("id,round,date,home_team,away_team,home_score,away_score,is_finished,championship_id,match_time,cup_stage,is_technical_defeat,technical_winner,penalty_home,penalty_away,penalty_winner,created_at")
      .eq("championship_id", championshipId)
      .or(`home_team.eq.${safeTeamName},away_team.eq.${safeTeamName}`)
      .order("date", { ascending: false })
      .order("round", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error getting team matches:", error)
    return mockMatches.filter(
      (match) =>
        match.championship_id === championshipId &&
        (match.home_team === teamName || match.away_team === teamName),
    )
  }
}

export async function addMatch(match: Omit<Match, "id" | "created_at">): Promise<Match> {
  if (shouldUseMockData()) {
    const newMatch = {
      ...match,
      id: Math.max(...mockMatches.map((m) => m.id)) + 1,
      created_at: new Date().toISOString(),
    }
    mockMatches.push(newMatch)
    return Promise.resolve(newMatch)
  }

  const { data, error } = await supabase.from("matches").insert([match]).select().single()
  if (error) throw error
  return data
}

export async function updateMatch(id: number, updates: Partial<Match>): Promise<Match> {
  if (shouldUseMockData()) {
    const index = mockMatches.findIndex((m) => m.id === id)
    if (index !== -1) {
      mockMatches[index] = { ...mockMatches[index], ...updates }
      return Promise.resolve(mockMatches[index])
    }
    throw new Error("Match not found")
  }

  const { data, error } = await supabase.from("matches").update(updates).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteMatch(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const index = mockMatches.findIndex((m) => m.id === id)
    if (index !== -1) {
      mockMatches.splice(index, 1)
    }
    return Promise.resolve()
  }

  const { error } = await supabase.from("matches").delete().eq("id", id)
  if (error) throw error
}

// Match Goals
export async function getMatchGoals(matchId: number): Promise<MatchGoal[]> {
  if (shouldUseMockData()) {
    return Promise.resolve([])
  }

  try {
    const { data, error } = await supabase
      .from("match_goals")
      .select("id,match_id,player_name,team_name,minute,goal_type,created_at")
      .eq("match_id", matchId)
      .order("minute", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error:", error)
    return []
  }
}

export async function getMatchesGoals(matchIds: number[]): Promise<MatchGoal[]> {
  if (shouldUseMockData() || matchIds.length === 0) {
    return Promise.resolve([])
  }

  try {
    const { data, error } = await supabase
      .from("match_goals")
      .select("id,match_id,player_name,team_name,minute,goal_type,created_at")
      .in("match_id", matchIds)
      .order("minute", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error:", error)
    return []
  }
}

export async function addMatchGoal(goal: {
  match_id: number
  player_name: string
  team_name: string
  minute?: number
  goal_type: "regular" | "penalty" | "own_goal"
}): Promise<MatchGoal> {
  if (shouldUseMockData()) {
    const newGoal = {
      ...goal,
      id: Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
    }
    return Promise.resolve(newGoal)
  }

  const { match_id, player_name, team_name, minute, goal_type } = goal
  const { data, error } = await supabase
    .from("match_goals")
    .insert([{ match_id, player_name, team_name, minute, goal_type }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMatchGoal(id: number): Promise<void> {
  if (shouldUseMockData()) {
    return Promise.resolve()
  }

  const { error } = await supabase.from("match_goals").delete().eq("id", id)
  if (error) throw error
}

// Match Cards
const mockMatchCards: MatchCard[] = []

export async function getMatchCards(matchId: number): Promise<MatchCard[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(mockMatchCards.filter((c) => c.match_id === matchId))
  }

  try {
    const { data, error } = await supabase
      .from("match_cards")
      .select("id,match_id,player_name,team_name,minute,card_type,created_at")
      .eq("match_id", matchId)
      .order("minute", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error (match_cards):", error)
    return mockMatchCards.filter((c) => c.match_id === matchId)
  }
}

export async function getMatchesCards(matchIds: number[]): Promise<MatchCard[]> {
  if (shouldUseMockData() || matchIds.length === 0) {
    return Promise.resolve([])
  }

  try {
    const { data, error } = await supabase
      .from("match_cards")
      .select("id,match_id,player_name,team_name,minute,card_type,created_at")
      .in("match_id", matchIds)
      .order("minute", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error (match_cards):", error)
    return []
  }
}

export async function addMatchCard(card: {
  match_id: number
  player_name: string
  team_name: string
  minute?: number
  card_type: "yellow" | "red" | "yellow_red"
}): Promise<MatchCard> {
  if (shouldUseMockData()) {
    const newCard: MatchCard = {
      ...card,
      id: Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
    }
    mockMatchCards.push(newCard)
    return Promise.resolve(newCard)
  }

  const { data, error } = await supabase
    .from("match_cards")
    .insert([card])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMatchCard(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const idx = mockMatchCards.findIndex((c) => c.id === id)
    if (idx !== -1) mockMatchCards.splice(idx, 1)
    return Promise.resolve()
  }

  const { error } = await supabase.from("match_cards").delete().eq("id", id)
  if (error) throw error
}

// Players
export async function getPlayers(championshipId?: number): Promise<Player[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(
      championshipId ? mockPlayers.filter((p) => p.championship_id === championshipId) : mockPlayers,
    )
  }

  try {
    let query = supabase
      .from("players")
      .select("id,name,team,goals,championship_id,created_at")
      .order("goals", { ascending: false })
    if (championshipId) {
      query = query.eq("championship_id", championshipId)
    }
    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error, using mock data:", error)
    return championshipId ? mockPlayers.filter((p) => p.championship_id === championshipId) : mockPlayers
  }
}

export async function getPlayerById(id: number): Promise<Player | null> {
  if (shouldUseMockData()) {
    return Promise.resolve(mockPlayers.find((player) => player.id === id) || null)
  }

  try {
    const { data, error } = await supabase
      .from("players")
      .select("id,name,team,goals,championship_id,created_at")
      .eq("id", id)
      .maybeSingle()

    if (error) throw error
    return data || null
  } catch (error) {
    console.warn("Database error getting player by id:", error)
    return mockPlayers.find((player) => player.id === id) || null
  }
}

export async function getPlayerGoals(playerName: string): Promise<MatchGoal[]> {
  if (shouldUseMockData()) return Promise.resolve([])

  try {
    const { data, error } = await supabase
      .from("match_goals")
      .select("id,match_id,player_name,team_name,minute,goal_type,created_at")
      .eq("player_name", playerName)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error getting player goals:", error)
    return []
  }
}

export async function getPlayerCards(playerName: string): Promise<MatchCard[]> {
  if (shouldUseMockData()) return Promise.resolve([])

  try {
    const { data, error } = await supabase
      .from("match_cards")
      .select("id,match_id,player_name,team_name,minute,card_type,created_at")
      .eq("player_name", playerName)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error getting player cards:", error)
    return []
  }
}

export async function addPlayer(player: Omit<Player, "id" | "created_at">): Promise<Player> {
  if (shouldUseMockData()) {
    const newPlayer = {
      ...player,
      id: Math.max(...mockPlayers.map((p) => p.id)) + 1,
      created_at: new Date().toISOString(),
    }
    mockPlayers.push(newPlayer)
    return Promise.resolve(newPlayer)
  }

  const { data, error } = await supabase.from("players").insert([player]).select().single()
  if (error) throw error
  return data
}

export async function updatePlayer(id: number, updates: Partial<Player>): Promise<Player> {
  if (shouldUseMockData()) {
    const index = mockPlayers.findIndex((p) => p.id === id)
    if (index !== -1) {
      mockPlayers[index] = { ...mockPlayers[index], ...updates }
      return Promise.resolve(mockPlayers[index])
    }
    throw new Error("Player not found")
  }

  const { data, error } = await supabase.from("players").update(updates).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deletePlayer(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const index = mockPlayers.findIndex((p) => p.id === id)
    if (index !== -1) {
      mockPlayers.splice(index, 1)
    }
    return Promise.resolve()
  }

  const { error } = await supabase.from("players").delete().eq("id", id)
  if (error) throw error
}

export async function calculateLeagueTable(championshipId?: number): Promise<import("./league-utils").LeagueStanding[]> {
  const [matches, teams] = await Promise.all([getMatches(championshipId), getTeams(championshipId)])
  return buildLeagueTable(matches, teams)
}

// Get cup matches by stage
export async function getCupMatches(championshipId: number, stage: string): Promise<Match[]> {
  if (shouldUseMockData()) {
    return Promise.resolve([])
  }

  try {
    const { data, error } = await supabase
      .from("matches")
      .select("id,round,date,home_team,away_team,home_score,away_score,is_finished,championship_id,match_time,cup_stage,is_technical_defeat,technical_winner,penalty_home,penalty_away,penalty_winner,created_at")
      .eq("championship_id", championshipId)
      .eq("cup_stage", stage)
      .order("date", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error:", error)
    return []
  }
}

// Lion of the Match functions
export async function getMatchVoting(matchId: number): Promise<MatchVoting | null> {
  if (shouldUseMockData()) {
    return Promise.resolve(mockMatchVotings.find((v) => v.match_id === matchId) || null)
  }

  try {
    const { data, error } = await supabase
      .from("match_votings")
      .select("match_id,is_active,start_time,end_time,created_at")
      .eq("match_id", matchId)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.warn("Database error getting match voting:", error)
    return mockMatchVotings.find((v) => v.match_id === matchId) || null
  }
}

export async function getVotingCandidates(matchId: number): Promise<VotingCandidate[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(mockVotingCandidates.filter((c) => c.match_id === matchId))
  }

  try {
    const { data, error } = await supabase
      .from("voting_candidates")
      .select("id,match_id,player_name,team_name,votes,is_hidden,created_at")
      .eq("match_id", matchId)
      .order("votes", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error getting voting candidates:", error)
    return mockVotingCandidates.filter((c) => c.match_id === matchId)
  }
}

export async function createOrUpdateVoting(
  matchId: number,
  startTime: string | null,
  endTime: string | null
): Promise<MatchVoting> {
  const payload = {
    match_id: matchId,
    start_time: startTime,
    end_time: endTime,
  }

  if (shouldUseMockData()) {
    const index = mockMatchVotings.findIndex((v) => v.match_id === matchId)
    const newVoting: MatchVoting = {
      match_id: matchId,
      is_active: index !== -1 ? mockMatchVotings[index].is_active : false,
      start_time: startTime,
      end_time: endTime,
      created_at: index !== -1 ? mockMatchVotings[index].created_at : new Date().toISOString(),
    }
    if (index !== -1) {
      mockMatchVotings[index] = newVoting
    } else {
      mockMatchVotings.push(newVoting)
    }
    return Promise.resolve(newVoting)
  }

  const { data, error } = await supabase
    .from("match_votings")
    .upsert(payload, { onConflict: "match_id" })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function setVotingActiveState(matchId: number, isActive: boolean): Promise<MatchVoting> {
  if (shouldUseMockData()) {
    const index = mockMatchVotings.findIndex((v) => v.match_id === matchId)
    if (index === -1) {
      const newVoting: MatchVoting = {
        match_id: matchId,
        is_active: isActive,
        start_time: null,
        end_time: null,
        created_at: new Date().toISOString(),
      }
      mockMatchVotings.push(newVoting)
      return Promise.resolve(newVoting)
    } else {
      mockMatchVotings[index].is_active = isActive
      return Promise.resolve(mockMatchVotings[index])
    }
  }

  const { data, error } = await supabase
    .from("match_votings")
    .update({ is_active: isActive })
    .eq("match_id", matchId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addVotingCandidate(
  matchId: number,
  playerName: string,
  teamName: string
): Promise<VotingCandidate> {
  if (shouldUseMockData()) {
    const newCandidate: VotingCandidate = {
      id: Math.floor(Math.random() * 10000) + 1,
      match_id: matchId,
      player_name: playerName,
      team_name: teamName,
      votes: 0,
      created_at: new Date().toISOString(),
    }
    mockVotingCandidates.push(newCandidate)
    return Promise.resolve(newCandidate)
  }

  const { data, error } = await supabase
    .from("voting_candidates")
    .insert([{ match_id: matchId, player_name: playerName, team_name: teamName }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteVotingCandidate(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const index = mockVotingCandidates.findIndex((c) => c.id === id)
    if (index !== -1) {
      mockVotingCandidates.splice(index, 1)
    }
    return Promise.resolve()
  }

  const { error } = await supabase.from("voting_candidates").delete().eq("id", id)
  if (error) throw error
}

export async function toggleVotingCandidateVisibility(id: number, isHidden: boolean): Promise<VotingCandidate> {
  if (shouldUseMockData()) {
    const index = mockVotingCandidates.findIndex((c) => c.id === id)
    if (index !== -1) {
      mockVotingCandidates[index].is_hidden = isHidden
      return Promise.resolve(mockVotingCandidates[index])
    }
    throw new Error("Candidate not found")
  }

  try {
    const { data, error } = await supabase
      .from("voting_candidates")
      .update({ is_hidden: isHidden })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.warn("Database error toggling candidate visibility:", error)
    const index = mockVotingCandidates.findIndex((c) => c.id === id)
    if (index !== -1) {
      mockVotingCandidates[index].is_hidden = isHidden
      return Promise.resolve(mockVotingCandidates[index])
    }
    throw new Error("Candidate not found")
  }
}

export async function incrementCandidateVotes(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const index = mockVotingCandidates.findIndex((c) => c.id === id)
    if (index !== -1) {
      mockVotingCandidates[index].votes = (mockVotingCandidates[index].votes || 0) + 1
    }
    return Promise.resolve()
  }

  const { error } = await supabase.rpc("cast_match_vote", { candidate_id: id })
  if (error) throw error
}

export async function updateVotingCandidate(id: number, playerName: string): Promise<VotingCandidate> {
  if (shouldUseMockData()) {
    const index = mockVotingCandidates.findIndex((c) => c.id === id)
    if (index !== -1) {
      mockVotingCandidates[index].player_name = playerName
      return Promise.resolve(mockVotingCandidates[index])
    }
    throw new Error("Candidate not found")
  }

  const { data, error } = await supabase
    .from("voting_candidates")
    .update({ player_name: playerName })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getChampionshipVotings(championshipId: number): Promise<MatchVoting[]> {
  if (shouldUseMockData()) {
    const matchIds = mockMatches.filter(m => m.championship_id === championshipId).map(m => m.id)
    return Promise.resolve(mockMatchVotings.filter(v => matchIds.includes(v.match_id)))
  }

  try {
    const { data: matches } = await supabase.from("matches").select("id").eq("championship_id", championshipId)
    const matchIds = matches?.map(m => m.id) || []
    if (matchIds.length === 0) return []

    const { data, error } = await supabase
      .from("match_votings")
      .select("*")
      .in("match_id", matchIds)

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error getting championship votings:", error)
    return []
  }
}

export async function getChampionshipCandidates(championshipId: number): Promise<VotingCandidate[]> {
  if (shouldUseMockData()) {
    const matchIds = mockMatches.filter(m => m.championship_id === championshipId).map(m => m.id)
    return Promise.resolve(mockVotingCandidates.filter(c => matchIds.includes(c.match_id)))
  }

  try {
    const { data: matches } = await supabase.from("matches").select("id").eq("championship_id", championshipId)
    const matchIds = matches?.map(m => m.id) || []
    if (matchIds.length === 0) return []

    const { data, error } = await supabase
      .from("voting_candidates")
      .select("*")
      .in("match_id", matchIds)
      .order("votes", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error getting championship candidates:", error)
    return []
  }
}

export async function getChampionshipVotingData(championshipId: number): Promise<{
  votings: MatchVoting[]
  candidates: VotingCandidate[]
}> {
  if (shouldUseMockData()) {
    const matchIds = mockMatches.filter((match) => match.championship_id === championshipId).map((match) => match.id)
    return {
      votings: mockMatchVotings.filter((voting) => matchIds.includes(voting.match_id)),
      candidates: mockVotingCandidates.filter((candidate) => matchIds.includes(candidate.match_id)),
    }
  }

  try {
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("championship_id", championshipId)

    if (matchesError) throw matchesError

    const matchIds = matches?.map((match) => match.id) ?? []
    if (matchIds.length === 0) return { votings: [], candidates: [] }

    const [votingsResult, candidatesResult] = await Promise.all([
      supabase
        .from("match_votings")
        .select("match_id,is_active,start_time,end_time,created_at")
        .in("match_id", matchIds),
      supabase
        .from("voting_candidates")
        .select("id,match_id,player_name,team_name,votes,is_hidden,created_at")
        .in("match_id", matchIds)
        .order("votes", { ascending: false }),
    ])

    if (votingsResult.error) throw votingsResult.error
    if (candidatesResult.error) throw candidatesResult.error

    return {
      votings: votingsResult.data ?? [],
      candidates: candidatesResult.data ?? [],
    }
  } catch (error) {
    console.warn("Database error getting championship voting data:", error)
    return { votings: [], candidates: [] }
  }
}

// ============================================================
// USER ANALYTICS & ORGANIZER AUDIT LOGGING
// ============================================================

export async function recordUserAnalytics(sessionId: string, activeTab: string, durationSeconds: number): Promise<number | null> {
  if (shouldUseMockData()) return null
  try {
    let userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
      if (isStandalone) {
        userAgent = `${userAgent} (PWA Standalone App)`
      }
    }

    const { data, error } = await supabase.rpc("record_user_analytics", {
      analytics_session_id: sessionId,
      analytics_active_tab: activeTab,
      analytics_duration_seconds: Math.max(1, Math.min(Math.round(durationSeconds), 86400)),
      analytics_user_agent: userAgent,
    })

    if (error) throw error
    return typeof data === "number" ? data : null
  } catch (error) {
    console.error("Error recording user analytics:", error)
    return null
  }
}

export async function updateAnalyticsDuration(rowId: number, durationSeconds: number, sessionId: string): Promise<void> {
  if (shouldUseMockData()) return
  try {
    const { error } = await supabase.rpc("update_user_analytics_duration", {
      analytics_id: rowId,
      analytics_session_id: sessionId,
      analytics_duration_seconds: Math.max(1, Math.min(Math.round(durationSeconds), 86400)),
    })
    if (error) throw error
  } catch (error) {
    console.error("Error updating analytics duration:", error)
  }
}

export async function cleanupOldAnalytics(): Promise<number> {
  if (shouldUseMockData()) return 0
  try {
    // Aggressive cleanup: delete entries older than 7 days to keep the table lean
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data, error } = await supabase
      .from("user_analytics")
      .delete()
      .lt("created_at", cutoff.toISOString())
      .select("id")

    if (error) throw error
    return data?.length ?? 0
  } catch (error) {
    console.error("Error cleaning up old analytics:", error)
    return 0
  }
}

// Summary type for pre-aggregated analytics (avoids Supabase 1000-row limit)
export interface AnalyticsSummary {
  totalPageViews: number
  totalPageViewsDisplay: string // "1523" or "1000+"
  uniqueSessions: number
  avgDurationSeconds: number
  tabBreakdown: { tab: string; views: number; totalTime: number }[]
}

export async function getAnalyticsSummary(period: "24h" | "7d" | "30d" = "24h"): Promise<AnalyticsSummary> {
  const empty: AnalyticsSummary = {
    totalPageViews: 0,
    totalPageViewsDisplay: "0",
    uniqueSessions: 0,
    avgDurationSeconds: 0,
    tabBreakdown: [],
  }
  if (shouldUseMockData()) return empty

  try {
    // Auto-cleanup old data first
    await cleanupOldAnalytics()

    const now = new Date()
    let cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    if (period === "7d") {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === "30d") {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const cutoffISO = cutoff.toISOString()

    // 1. Get exact total count using Supabase head:true + count (no row data fetched)
    const { count: totalCount, error: countErr } = await supabase
      .from("user_analytics")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoffISO)

    if (countErr) throw countErr
    const total = totalCount ?? 0

    // 2. Fetch only session_id + active_tab + duration (lightweight columns), max 1000 rows
    //    For periods with >1000 rows, we still get a representative sample
    const { data: rows, error: rowsErr } = await supabase
      .from("user_analytics")
      .select("session_id, active_tab, duration_seconds")
      .gte("created_at", cutoffISO)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (rowsErr) throw rowsErr
    const fetchedRows = rows || []

    // 3. Compute unique sessions from fetched sample
    const sessionSet = new Set(fetchedRows.map((r: any) => r.session_id))

    // 4. Compute avg duration from fetched sample
    const totalDuration = fetchedRows.reduce((acc: number, r: any) => acc + (r.duration_seconds || 0), 0)
    const avgDuration = fetchedRows.length > 0 ? Math.round(totalDuration / fetchedRows.length) : 0

    // 5. Compute tab breakdown from fetched sample, then scale to total
    const tabMap: { [key: string]: { views: number; totalTime: number } } = {}
    fetchedRows.forEach((r: any) => {
      if (!tabMap[r.active_tab]) tabMap[r.active_tab] = { views: 0, totalTime: 0 }
      tabMap[r.active_tab].views += 1
      tabMap[r.active_tab].totalTime += r.duration_seconds || 0
    })

    // Scale up tab views proportionally if total > fetched
    const scaleFactor = fetchedRows.length > 0 ? total / fetchedRows.length : 1
    const tabBreakdown = Object.entries(tabMap)
      .map(([tab, stats]) => ({
        tab,
        views: Math.round(stats.views * scaleFactor),
        totalTime: Math.round(stats.totalTime * scaleFactor),
      }))
      .sort((a, b) => b.views - a.views)

    // 6. Display string
    const display = total > 1000 && fetchedRows.length >= 1000
      ? `${total}`
      : `${total}`

    return {
      totalPageViews: total,
      totalPageViewsDisplay: display,
      uniqueSessions: sessionSet.size,
      avgDurationSeconds: avgDuration,
      tabBreakdown,
    }
  } catch (error) {
    console.warn("Error fetching analytics summary:", error)
    return empty
  }
}

// Keep getUserAnalytics for backward compatibility, but with hard limit
export async function getUserAnalytics(period: "24h" | "7d" | "30d" = "24h"): Promise<UserAnalytics[]> {
  if (shouldUseMockData()) return []
  try {
    await cleanupOldAnalytics()

    const now = new Date()
    let cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    if (period === "7d") {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === "30d") {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const { data, error } = await supabase
      .from("user_analytics")
      .select("*")
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000)

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Error fetching user analytics:", error)
    return []
  }
}

export async function logOrganizerAction(
  organizerName: string,
  actionType: string,
  description: string,
  details?: any
): Promise<void> {
  if (shouldUseMockData()) return
  try {
    await supabase.from("organizer_logs").insert([{
      organizer_name: organizerName || "Адміністратор",
      action_type: actionType,
      description,
      details: details ? JSON.stringify(details) : null
    }])
  } catch (error) {
    console.error("Error logging organizer action:", error)
  }
}

export async function getOrganizerLogs(): Promise<OrganizerLog[]> {
  if (shouldUseMockData()) return []
  try {
    const { data, error } = await supabase
      .from("organizer_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Error fetching organizer logs:", error)
    return []
  }
}

export async function clearOrganizerLogs(): Promise<void> {
  if (shouldUseMockData()) return
  try {
    const { error } = await supabase.from("organizer_logs").delete().neq("id", 0)
    if (error) throw error
  } catch (error) {
    console.error("Error clearing organizer logs:", error)
    throw error
  }
}

// KS Games Leaderboard - Only highest score per player
export async function getGameLeaderboard(gameType: "dino" | "snake", limit = 10): Promise<GameScore[]> {
  if (shouldUseMockData()) return []
  try {
    const { data, error } = await supabase
      .from("game_scores")
      .select("*")
      .eq("game_type", gameType)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(50)

    if (error) throw error
    if (!data) return []

    // Deduplicate to guarantee strictly 1 entry per unique player (highest score)
    const seen = new Set<string>()
    const uniqueScores: GameScore[] = []
    for (const row of data) {
      const key = row.player_name?.trim().toLowerCase()
      if (key && !seen.has(key)) {
        seen.add(key)
        uniqueScores.push(row)
        if (uniqueScores.length >= limit) break
      }
    }
    return uniqueScores
  } catch (error) {
    console.warn(`Error fetching ${gameType} leaderboard:`, error)
    return []
  }
}

export async function saveGameScore(playerName: string, gameType: "dino" | "snake", score: number): Promise<GameScore | null> {
  if (!playerName || !playerName.trim() || score <= 0) return null
  const cleanName = playerName.trim().slice(0, 30)

  if (shouldUseMockData()) {
    return {
      id: Date.now(),
      player_name: cleanName,
      game_type: gameType,
      score,
      created_at: new Date().toISOString(),
    }
  }

  try {
    const { data, error } = await supabase.rpc("submit_game_score", {
      score_player_name: cleanName,
      score_game_type: gameType,
      score_value: score,
    })
    if (error) {
      console.error("Error saving score in DB:", error)
      throw error
    }
    return data as GameScore
  } catch (error) {
    console.error("Error saving game score:", error)
    return null
  }
}



