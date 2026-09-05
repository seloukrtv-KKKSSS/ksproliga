import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createLionVotingSnapshot, type LionVotingCandidate, type LionVotingSnapshot } from "./lion-voting-model"

const candidateColumns = "id,player_name,team_name,votes" as const
const candidatePageSize = 1_000

type LionVotingResult =
  | { status: "ok"; snapshot: LionVotingSnapshot }
  | { status: "not-found" }
  | { status: "unavailable" }

function getPublicConfiguration(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null

  try {
    const parsedUrl = new URL(url)
    if (!["https:", "http:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) return null
    // This public broadcast endpoint must never gain service-role access through a misconfigured key.
    if (key.startsWith("sb_publishable_") && key.length > 20) return { url, key }
    const parts = key.split(".")
    if (parts.length !== 3) return null
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
    return claims.role === "anon" ? { url, key } : null
  } catch {
    return null
  }
}

async function getVisibleCandidates(client: SupabaseClient, matchId: number, signal: AbortSignal): Promise<LionVotingCandidate[] | null> {
  const first = await client.from("voting_candidates")
    .select(candidateColumns, { count: "exact" })
    .eq("match_id", matchId)
    .or("is_hidden.is.null,is_hidden.eq.false")
    .order("id", { ascending: true })
    .limit(candidatePageSize)
    .abortSignal(signal)

  if (first.error || !first.data || first.count === null || !Number.isSafeInteger(first.count) || first.count < first.data.length) return null
  const candidates: LionVotingCandidate[] = [...first.data]

  // PostgREST can cap responses below the requested limit. Never compute percentages from a truncated roster.
  while (candidates.length < first.count) {
    const lastId = candidates.at(-1)?.id
    if (lastId === undefined || signal.aborted) return null
    const page = await client.from("voting_candidates")
      .select(candidateColumns)
      .eq("match_id", matchId)
      .or("is_hidden.is.null,is_hidden.eq.false")
      .gt("id", lastId)
      .order("id", { ascending: true })
      .limit(Math.min(candidatePageSize, first.count - candidates.length))
      .abortSignal(signal)

    if (page.error || !page.data?.length || page.data.some((candidate) => candidate.id <= lastId)) return null
    candidates.push(...page.data)
  }
  return candidates.length === first.count ? candidates : null
}

/** A fresh public snapshot; failures never fall back to demo voting results. */
export async function getLionVotingSnapshot(matchId: number, requestSignal?: AbortSignal): Promise<LionVotingResult> {
  const configuration = getPublicConfiguration()
  if (!configuration) return { status: "unavailable" }

  try {
    const client = createClient(configuration.url, configuration.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { retry: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    })
    const timeout = AbortSignal.timeout(7_000)
    const signal = requestSignal ? AbortSignal.any([requestSignal, timeout]) : timeout
    const [matchResult, candidates] = await Promise.all([
      client.from("matches").select("home_team,away_team").eq("id", matchId).abortSignal(signal).maybeSingle(),
      getVisibleCandidates(client, matchId, signal),
    ])

    if (matchResult.error || !candidates) return { status: "unavailable" }
    if (!matchResult.data) return { status: "not-found" }
    return { status: "ok", snapshot: createLionVotingSnapshot(matchResult.data, candidates) }
  } catch {
    return { status: "unavailable" }
  }
}
