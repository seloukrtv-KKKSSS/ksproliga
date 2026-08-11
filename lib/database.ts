import { supabase } from "./supabase"
import type { Championship, Team, Match, Player, MatchGoal, MatchCard, MatchVoting, VotingCandidate, Organizer, Product, UserAnalytics, OrganizerLog } from "./supabase"

export function formatTime(timeStr?: string): string {
  if (!timeStr) return ""
  const parts = timeStr.trim().split(":")
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
  }
  return timeStr
}

export function sortChampionships(championships: Championship[]): Championship[] {
  return [...championships].sort((a, b) => {
    const orderA = a.sort_order !== undefined && a.sort_order !== null ? a.sort_order : 999999
    const orderB = b.sort_order !== undefined && b.sort_order !== null ? b.sort_order : 999999
    if (orderA !== orderB) {
      return orderA - orderB
    }
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1
    }
    if (a.tournament_type !== b.tournament_type) {
      return a.tournament_type === "league" ? -1 : 1
    }
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })
}


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
const shouldUseMockData = () => {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEW_NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL
}

// Championships
export async function getChampionships(): Promise<Championship[]> {
  if (shouldUseMockData()) {
    return Promise.resolve(sortChampionships(mockChampionships))
  }

  try {
    const { data, error } = await supabase.from("championships").select("*").order("created_at", { ascending: false })
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
    const { data, error } = await supabase.from("championships").select("*").eq("is_active", true).maybeSingle()
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

// Organizers & Authentication
export async function getOrganizers(): Promise<Organizer[]> {
  if (shouldUseMockData()) {
    return Promise.resolve([...mockOrganizers])
  }

  try {
    const { data, error } = await supabase.from("organizers").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("Database error, using mock data for organizers:", error)
    return mockOrganizers
  }
}

export async function addOrganizer(organizer: Omit<Organizer, "id" | "created_at">): Promise<Organizer> {
  if (shouldUseMockData()) {
    const newOrganizer: Organizer = {
      ...organizer,
      id: Math.max(0, ...mockOrganizers.map((o) => o.id)) + 1,
      created_at: new Date().toISOString(),
    }
    mockOrganizers.push(newOrganizer)
    return Promise.resolve(newOrganizer)
  }

  const { data, error } = await supabase.from("organizers").insert([organizer]).select().single()
  if (error) throw error
  return data
}

export async function updateOrganizer(id: number, updates: Partial<Organizer>): Promise<Organizer> {
  if (shouldUseMockData()) {
    const index = mockOrganizers.findIndex((o) => o.id === id)
    if (index !== -1) {
      mockOrganizers[index] = { ...mockOrganizers[index], ...updates }
      return Promise.resolve(mockOrganizers[index])
    }
    throw new Error("Organizer not found")
  }

  const { data, error } = await supabase.from("organizers").update(updates).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteOrganizer(id: number): Promise<void> {
  if (shouldUseMockData()) {
    const index = mockOrganizers.findIndex((o) => o.id === id)
    if (index !== -1) {
      mockOrganizers.splice(index, 1)
    }
    return Promise.resolve()
  }

  const { error } = await supabase.from("organizers").delete().eq("id", id)
  if (error) throw error
}

export async function authenticateUser(password: string): Promise<
  | { type: "main" }
  | { type: "organizer"; organizer: Organizer }
  | null
> {
  if (password === "ks2025") {
    return { type: "main" }
  }

  const organizers = await getOrganizers()
  const found = organizers.find((o) => o.password === password)
  if (found) {
    const now = new Date().toISOString()
    try {
      await updateOrganizer(found.id, { last_login_at: now })
    } catch (e) {
      console.error("Failed to update organizer last_login_at:", e)
    }
    return { type: "organizer", organizer: { ...found, last_login_at: now } }
  }

  return null
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
    .select("*")
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

  const { data, error } = await supabase.from("products").insert([product]).select().single()
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
    let query = supabase.from("teams").select("*").order("name")
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
      .select("*")
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
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) throw error
    return data || null
  } catch (error) {
    console.warn("Database error getting match by id:", error)
    return mockMatches.find((m) => m.id === id) || null
  }
}

export function getMatchStatusInfo(match: {
  date: string
  match_time?: string | null
  is_finished?: boolean
  home_score?: number | null
  away_score?: number | null
  is_technical_defeat?: boolean
  technical_winner?: string | null
  penalty_home?: number | null
  penalty_away?: number | null
  home_team?: string
  away_team?: string
}) {
  if (match.is_finished) {
    if (match.is_technical_defeat) {
      const isHomeWinner = match.technical_winner === match.home_team
      return {
        status: "finished",
        badgeText: `Технічна поразка (${isHomeWinner ? "+:-" : "-:+"})`,
        scoreText: isHomeWinner ? "+ : -" : "- : +",
        badgeClass: "bg-red-50 text-red-700 border-red-200",
        isLive: false,
      }
    }
    const penText = match.penalty_home !== null && match.penalty_home !== undefined && match.penalty_away !== null && match.penalty_away !== undefined
      ? ` (${match.penalty_home}-${match.penalty_away} пен.)`
      : ""
    return {
      status: "finished",
      badgeText: "Завершено",
      scoreText: `${match.home_score ?? 0} : ${match.away_score ?? 0}${penText}`,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isLive: false,
    }
  }

  if (match.home_score !== null && match.home_score !== undefined && match.away_score !== null && match.away_score !== undefined) {
    return {
      status: "finished",
      badgeText: "Завершено",
      scoreText: `${match.home_score} : ${match.away_score}`,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isLive: false,
    }
  }

  let matchDateTime: Date | null = null
  if (match.date) {
    const dateStr = match.date.split("T")[0]
    const timeStr = match.match_time || "00:00"
    matchDateTime = new Date(`${dateStr}T${timeStr.length === 5 ? timeStr + ":00" : timeStr}`)
  }

  const now = new Date()
  if (matchDateTime && !isNaN(matchDateTime.getTime())) {
    if (now >= matchDateTime) {
      return {
        status: "ongoing",
        badgeText: "🔴 Матч триває",
        scoreText: "Матч триває",
        badgeClass: "bg-red-50 text-red-700 border-red-200 animate-pulse font-extrabold",
        isLive: true,
      }
    }
  }

  return {
    status: "upcoming",
    badgeText: "Очікується",
    scoreText: "VS",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    isLive: false,
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
      .select("*")
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
      .select("*")
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
      .select("*")
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
      .select("*")
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
    let query = supabase.from("players").select("*").order("goals", { ascending: false })
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

// Calculate league table from matches
export async function calculateLeagueTable(championshipId?: number) {
  const matches = await getMatches(championshipId)
  const teams = await getTeams(championshipId)

  const table = teams.map((team) => ({
    name: team.name,
    city: team.city,
    logo: team.logo,
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    pts: 0,
  }))

  const findTeamInTable = (teamName: string | undefined | null) => {
    if (!teamName) return undefined
    const clean = teamName.trim()
    const lower = clean.toLowerCase()
    return table.find((t) => t.name === clean) || table.find((t) => t.name.trim().toLowerCase() === lower)
  }

  matches
    .filter((match) => match.is_finished)
    .forEach((match) => {
      const homeTeam = findTeamInTable(match.home_team)
      const awayTeam = findTeamInTable(match.away_team)

      if (homeTeam && awayTeam) {
        if (match.is_technical_defeat) {
          homeTeam.games++
          awayTeam.games++
          const techWinner = match.technical_winner?.trim().toLowerCase()
          if (techWinner && techWinner === match.home_team?.trim().toLowerCase()) {
            homeTeam.wins++
            homeTeam.pts += 3
            awayTeam.losses++
          } else if (techWinner && techWinner === match.away_team?.trim().toLowerCase()) {
            awayTeam.wins++
            awayTeam.pts += 3
            homeTeam.losses++
          }
        } else if (match.home_score !== null && match.away_score !== null) {
          homeTeam.games++
          awayTeam.games++
          homeTeam.gf += match.home_score
          homeTeam.ga += match.away_score
          awayTeam.gf += match.away_score
          awayTeam.ga += match.home_score

          if (match.home_score > match.away_score) {
            homeTeam.wins++
            homeTeam.pts += 3
            awayTeam.losses++
          } else if (match.home_score < match.away_score) {
            awayTeam.wins++
            awayTeam.pts += 3
            homeTeam.losses++
          } else {
            homeTeam.draws++
            awayTeam.draws++
            homeTeam.pts += 1
            awayTeam.pts += 1
          }
        }
      }
    })

  return table.sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga))
}

// Get cup matches by stage
export async function getCupMatches(championshipId: number, stage: string): Promise<Match[]> {
  if (shouldUseMockData()) {
    return Promise.resolve([])
  }

  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
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
      .select("*")
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
      .select("*")
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

  const { data: candidate, error: fetchError } = await supabase
    .from("voting_candidates")
    .select("votes")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  const currentVotes = candidate?.votes || 0
  const { error: updateError } = await supabase
    .from("voting_candidates")
    .update({ votes: currentVotes + 1 })
    .eq("id", id)

  if (updateError) throw updateError
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

    const { data, error } = await supabase.from("user_analytics").insert([{
      session_id: sessionId,
      active_tab: activeTab,
      duration_seconds: Math.max(1, Math.min(Math.round(durationSeconds), 86400)),
      user_agent: userAgent
    }]).select("id")

    if (error) throw error
    return data?.[0]?.id ?? null
  } catch (error) {
    console.error("Error recording user analytics:", error)
    return null
  }
}

export async function updateAnalyticsDuration(rowId: number, durationSeconds: number): Promise<void> {
  if (shouldUseMockData()) return
  try {
    await supabase
      .from("user_analytics")
      .update({ duration_seconds: Math.max(1, Math.min(Math.round(durationSeconds), 86400)) })
      .eq("id", rowId)
  } catch (error) {
    console.error("Error updating analytics duration:", error)
  }
}

export async function cleanupOldAnalytics(): Promise<number> {
  if (shouldUseMockData()) return 0
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
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

export async function getUserAnalytics(period: "24h" | "7d" | "30d" = "24h"): Promise<UserAnalytics[]> {
  if (shouldUseMockData()) return []
  try {
    // Auto-cleanup: delete entries older than 30 days on each fetch
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



