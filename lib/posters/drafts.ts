import type { PosterData, PosterOptions } from "./model"

export interface PosterDraft {
  options: PosterOptions
  imageUrls: Record<string, string>
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">
const MAX_DRAFT_CHARS = 1_500_000

function teamKey(key: string): boolean {
  return key.length <= 1024 && /^team:\d+:.+$/u.test(key)
}

export function getPosterDraftKey(data: PosterData): string | null {
  const match = data.matches[0]
  if (!match || !Number.isSafeInteger(match.championship_id) || match.championship_id < 1) return null
  const id = data.mode === "match" ? match.id : match.round
  if (!Number.isSafeInteger(id) || id < 0) return null
  // A round keeps its identity when fixtures are added, removed or finished.
  return `ksliga:poster-draft:v1:${match.championship_id}:${data.mode}:${id}`
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function imageUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 4096) return undefined
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password ? value : undefined
  } catch {
    return undefined
  }
}

function normalizeDraft(value: unknown, defaults: PosterOptions): PosterDraft {
  const source = record(value) && record(value.options) ? value.options : {}
  const options: PosterOptions = { ...defaults, sponsors: [], teamLogos: {}, page: 0 }
  if (["stadium", "editorial", "minimal"].includes(String(source.template))) options.template = source.template as PosterOptions["template"]
  if (["post", "story", "square"].includes(String(source.format))) options.format = source.format as PosterOptions["format"]
  if (["sans", "condensed", "serif"].includes(String(source.font))) options.font = source.font as PosterOptions["font"]
  if (typeof source.accent === "string" && /^#[\da-f]{6}$/i.test(source.accent)) options.accent = source.accent
  for (const [key, limit] of [["title", 80], ["subtitle", 150], ["venue", 120], ["footer", 100]] as const) {
    if (typeof source[key] === "string") options[key] = source[key].slice(0, limit)
  }
  for (const key of ["showTime", "showVenue", "showScores", "showScorers"] as const) {
    if (typeof source[key] === "boolean") options[key] = source[key]
  }
  for (const key of ["backgroundOpacity", "backgroundPosition"] as const) {
    if (typeof source[key] === "number" && Number.isFinite(source[key])) options[key] = Math.max(0, Math.min(100, source[key]))
  }
  options.backgroundUrl = imageUrl(source.backgroundUrl)
  if (record(source.teamLogos)) {
    options.teamLogos = Object.fromEntries(Object.entries(source.teamLogos).filter(([key, url]) => teamKey(key) && imageUrl(url)).slice(0, 128)) as Record<string, string>
  }
  const ids = new Set<string>()
  if (Array.isArray(source.sponsors)) {
    for (const sponsor of source.sponsors.slice(0, 8)) {
      if (!record(sponsor) || typeof sponsor.id !== "string" || !sponsor.id || sponsor.id.length > 80 || ids.has(sponsor.id)) continue
      ids.add(sponsor.id)
      options.sponsors.push({ id: sponsor.id, name: typeof sponsor.name === "string" ? sponsor.name.slice(0, 60) : "", url: imageUrl(sponsor.url) || "" })
    }
  }
  options.mainSponsorId = typeof source.mainSponsorId === "string" && ids.has(source.mainSponsorId) ? source.mainSponsorId : undefined
  const rawUrls = record(value) && record(value.imageUrls) ? value.imageUrls : {}
  const keys = ["background", ...options.sponsors.map((sponsor) => `sponsor:${sponsor.id}`), ...Object.keys(rawUrls).filter(teamKey).slice(0, 128)]
  const imageUrls = Object.fromEntries(keys.filter((key) => typeof rawUrls[key] === "string").map((key) => [key, (rawUrls[key] as string).slice(0, 4096)]))
  return { options, imageUrls }
}

export function loadPosterDraft(storage: DraftStorage | undefined, key: string | null, defaults: PosterOptions) {
  const empty: PosterDraft = { options: defaults, imageUrls: {} }
  if (!storage || !key) return { draft: empty, restored: false, available: false }
  let raw: string | null
  try {
    raw = storage.getItem(key)
  } catch {
    return { draft: empty, restored: false, available: false }
  }
  try {
    if (!raw || raw.length > MAX_DRAFT_CHARS) return { draft: empty, restored: false, available: true }
    const value: unknown = JSON.parse(raw)
    if (!record(value) || value.version !== 1 || !record(value.options)) return { draft: empty, restored: false, available: true }
    return { draft: normalizeDraft(value, defaults), restored: true, available: true }
  } catch {
    // A damaged JSON record must not stop the editor from opening.
    return { draft: empty, restored: false, available: true }
  }
}

export function savePosterDraft(storage: DraftStorage | undefined, key: string | null, draft: PosterDraft): boolean {
  if (!storage || !key) return false
  try {
    // Persist only settings and URL text, never canvas pixels, files or match data.
    const safe = normalizeDraft(draft, draft.options)
    const serialized = JSON.stringify({ version: 1, ...safe })
    if (serialized.length > MAX_DRAFT_CHARS) return false
    storage.setItem(key, serialized)
    return true
  } catch {
    return false
  }
}

export function removePosterDraft(storage: DraftStorage | undefined, key: string | null): boolean {
  if (!storage || !key) return false
  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}
