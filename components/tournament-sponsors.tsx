"use client"

import { useEffect, useState } from "react"
import { getTournamentSponsors, type SponsorPlacement, type TournamentSponsor } from "@/lib/tournaments"
import { SafeImage } from "@/components/safe-image"

export function TournamentSponsors({ championshipId, placement, refreshKey = 0 }: { championshipId: number; placement: SponsorPlacement; refreshKey?: number }) {
  const [result, setResult] = useState<{ id: number; sponsors: TournamentSponsor[] } | null>(null)
  useEffect(() => {
    let cancelled = false
    void getTournamentSponsors(championshipId).then((sponsors) => { if (!cancelled) setResult({ id: championshipId, sponsors }) }).catch(() => { if (!cancelled) setResult(null) })
    return () => { cancelled = true }
  }, [championshipId, refreshKey])
  const sponsors = result?.id === championshipId ? result.sponsors.filter((sponsor) => sponsor.is_active && sponsor.placements.includes(placement)) : []
  if (!sponsors.length) return null
  return <aside aria-label="Титульні партнери турніру" className="my-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
    <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 sm:justify-start">
      <span className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Титульні<br />партнери турніру</span>
      {sponsors.map((sponsor) => {
        const content = <><SafeImage src={sponsor.logo_url} alt={sponsor.name} width={180} height={64} unoptimized className="h-14 w-36 object-contain" /></>
        return sponsor.website_url ? <a key={sponsor.id} href={sponsor.website_url} target="_blank" rel="noopener noreferrer sponsored" title={sponsor.name} className="rounded-lg p-1 transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-blue-600">{content}</a> : <div key={sponsor.id} title={sponsor.name} className="p-1">{content}</div>
      })}
    </div>
  </aside>
}
