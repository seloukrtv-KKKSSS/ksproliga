import { ExternalLink, Tv } from "lucide-react"
import type { Match } from "@/lib/supabase"
import {
  getMatchBroadcastLabel,
  getMatchBroadcastState,
  getYouTubeEmbedUrl,
  normalizeYouTubeUrl,
} from "@/lib/match-utils"

type YouTubeBroadcastProps = {
  match: Match
}

export function YouTubeBroadcast({ match }: YouTubeBroadcastProps) {
  const embedUrl = getYouTubeEmbedUrl(match.youtube_url)
  const watchUrl = normalizeYouTubeUrl(match.youtube_url)
  if (!embedUrl || !watchUrl) return null

  const state = getMatchBroadcastState(match)
  const label = getMatchBroadcastLabel(match)

  return (
    <section className="broadcast-card" aria-labelledby="match-broadcast-title">
      <div className="broadcast-card__header">
        <div>
          <span className={`broadcast-status broadcast-status--${state}`}>
            <Tv aria-hidden="true" />
            {label}
          </span>
          <h2 id="match-broadcast-title">Дивіться матч на YouTube</h2>
          <p>
            {state === "scheduled"
              ? "Плеєр активується на сторінці трансляції у запланований час."
              : state === "recording"
                ? "Повний запис матчу доступний у вбудованому плеєрі."
                : "Трансляція доступна у вбудованому плеєрі або безпосередньо на YouTube."}
          </p>
        </div>
        <a className="ios-btn-secondary broadcast-card__link" href={watchUrl} target="_blank" rel="noreferrer">
          Відкрити YouTube <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <div className="broadcast-player">
        <iframe
          src={embedUrl}
          title={`${label}: ${match.home_team} — ${match.away_team}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </section>
  )
}
