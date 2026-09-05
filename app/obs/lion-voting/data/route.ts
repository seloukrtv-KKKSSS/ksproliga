import { createHash } from "node:crypto"
import { getLionVotingSnapshot } from "@/lib/obs/lion-voting-data"
import { matchesLionVotingEtag, parseLionVotingMatchId } from "@/lib/obs/lion-voting-model"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  })
  const values = new URL(request.url).searchParams.getAll("matchId")
  const matchId = values.length === 1 ? parseLionVotingMatchId(values[0]) : null
  if (matchId === null) return Response.json({ error: "invalid-match-id" }, { status: 400, headers })

  const result = await getLionVotingSnapshot(matchId, request.signal)
  if (result.status === "not-found") return Response.json({ error: "match-not-found" }, { status: 404, headers })
  if (result.status === "unavailable") {
    return Response.json({ error: "voting-unavailable" }, { status: 503, headers })
  }

  const body = JSON.stringify(result.snapshot)
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`
  headers.set("ETag", etag)
  if (matchesLionVotingEtag(request.headers.get("If-None-Match"), etag)) {
    return new Response(null, { status: 304, headers })
  }

  headers.set("Content-Type", "application/json; charset=utf-8")
  return new Response(body, { headers })
}
