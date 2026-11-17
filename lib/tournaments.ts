import { isSupabaseConfigured, supabase, type Match } from "./supabase"
import type { CupConfig, CupFixture, CupState } from "./cup"

export const SPONSOR_PLACEMENTS = [
  ["overview", "Огляд"], ["table", "Таблиця"], ["cup", "Кубок"], ["calendar", "Календар"],
  ["results", "Результати"], ["scorers", "Статистика гравців"], ["lion", "Лев матчу"],
  ["shop", "Магазин"], ["games", "Ігри"], ["match", "Сторінки матчів"],
  ["team", "Сторінки команд"], ["player", "Сторінки гравців"], ["posters", "Афіші"],
] as const
export type SponsorPlacement = typeof SPONSOR_PLACEMENTS[number][0]
export interface TournamentSponsor {
  id: number
  championship_id: number
  name: string
  logo_url: string
  website_url: string | null
  placements: SponsorPlacement[]
  sort_order: number
  is_active: boolean
}

export function validateSponsorUrl(value: string, required = true): string | null {
  const clean = value.trim()
  if (!clean && !required) return null
  try {
    const url = new URL(clean)
    if (url.protocol === "https:" && !url.username && !url.password && clean.length <= 4096) return clean
  } catch { /* The field displays the validation message. */ }
  throw new Error("Вкажіть пряме HTTPS-посилання без логіна й пароля.")
}

export async function getTournamentSponsors(championshipId: number): Promise<TournamentSponsor[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from("tournament_sponsors").select("*").eq("championship_id", championshipId).order("sort_order").order("id")
  if (error) throw error
  return data || []
}

export async function saveTournamentSponsor(sponsor: Omit<TournamentSponsor, "id"> & { id?: number }): Promise<void> {
  const name = sponsor.name.trim()
  if (!name || name.length > 80) throw new Error("Вкажіть назву спонсора до 80 символів.")
  const values = {
    name,
    logo_url: validateSponsorUrl(sponsor.logo_url),
    website_url: validateSponsorUrl(sponsor.website_url || "", false),
    placements: sponsor.placements,
    sort_order: sponsor.sort_order,
    is_active: sponsor.is_active,
  }
  const query = sponsor.id
    ? supabase.from("tournament_sponsors").update(values).eq("id", sponsor.id).eq("championship_id", sponsor.championship_id)
    : supabase.from("tournament_sponsors").insert({ ...values, championship_id: sponsor.championship_id })
  const { data, error } = await query.select("id").single()
  if (error) throw error
  if (!data) throw new Error("Налаштування не збережено. Перевірте доступ до турніру.")
}

export async function deleteTournamentSponsor(id: number, championshipId: number): Promise<void> {
  const { data, error } = await supabase.from("tournament_sponsors").delete().eq("id", id).eq("championship_id", championshipId).select("id").single()
  if (error) throw error
  if (!data) throw new Error("Спонсора не видалено.")
}

export async function getCupState(championshipId: number): Promise<CupState> {
  if (!isSupabaseConfigured) return { format: null, fixtures: [], matches: [] }
  const [format, fixtures, matches] = await Promise.all([
    supabase.from("cup_formats").select("*").eq("championship_id", championshipId).maybeSingle(),
    readCupRows<CupFixture>("cup_fixtures", championshipId),
    readCupRows<Match>("matches", championshipId),
  ])
  if (format.error) throw format.error
  return { format: format.data, fixtures, matches }
}

async function readCupRows<T>(table: "cup_fixtures" | "matches", championshipId: number): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += 500) {
    let request = supabase.from(table).select("*").eq("championship_id", championshipId)
    request = table === "matches" ? request.order("id") : request.order("stage").order("position")
    const { data, error } = await request.range(offset, offset + 499)
    if (error) throw error
    rows.push(...((data || []) as T[]))
    if (!data || data.length < 500) return rows
  }
}

export async function publishCupFormat(championshipId: number, config: CupConfig, fixtures: CupFixture[], revision: number): Promise<void> {
  const { error } = await supabase.rpc("publish_cup_format", { p_championship: championshipId, p_config: config, p_fixtures: fixtures, p_revision: revision })
  if (error) throw error
}

export async function scheduleCupFixture(championshipId: number, fixture: CupFixture, revision: number): Promise<void> {
  const { error } = await supabase.rpc("schedule_cup_fixture", { p_championship: championshipId, p_fixture: fixture.id, p_date: fixture.scheduled_date, p_time: fixture.scheduled_time || null, p_gap: fixture.leg_gap_days, p_label: fixture.label, p_revision: revision })
  if (error) throw error
}

export async function setCupStageLegs(championshipId: number, stage: number, legs: 1 | 2, revision: number, thirdPlace = false): Promise<void> {
  const { error } = await supabase.rpc("set_cup_stage_legs", { p_championship: championshipId, p_stage: stage, p_legs: legs, p_revision: revision, p_third_place: thirdPlace })
  if (error) throw error
}

export function tournamentError(error: unknown): string {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "Не вдалося зберегти зміни. Спробуйте ще раз."
}
