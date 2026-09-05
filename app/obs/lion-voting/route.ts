import { renderLionVotingDocument } from "@/lib/obs/lion-voting-document"
import { parseLionVotingMatchId } from "@/lib/obs/lion-voting-model"

// A Route Handler deliberately bypasses the site's React runtime, fonts and layout.
export function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const matchId = parseLionVotingMatchId(params.get("matchId"))
  const requestedRefresh = Number(params.get("refresh") ?? 5)
  const refreshMs = Number.isFinite(requestedRefresh) && requestedRefresh > 0
    ? Math.round(Math.min(60, Math.max(2, requestedRefresh)) * 1_000)
    : 5_000

  return new Response(renderLionVotingDocument(matchId, refreshMs), {
    status: matchId ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'",
    },
  })
}
