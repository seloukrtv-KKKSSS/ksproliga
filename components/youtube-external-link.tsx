import type { MouseEventHandler } from "react"
import { ExternalLink, Tv } from "lucide-react"
import { normalizeYouTubeUrl } from "@/lib/match-utils"

interface YouTubeExternalLinkProps {
  url?: string | null
  label: string
  ariaLabel?: string
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  showExternalIcon?: boolean
}

export function YouTubeExternalLink({
  url,
  label,
  ariaLabel,
  className,
  onClick,
  showExternalIcon = true,
}: YouTubeExternalLinkProps) {
  const watchUrl = normalizeYouTubeUrl(url)
  if (!watchUrl) return null

  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel || `Відкрити ${label} на YouTube`}
      className={className}
      onClick={onClick}
    >
      <Tv aria-hidden="true" />
      <span>{label}</span>
      {showExternalIcon && <ExternalLink aria-hidden="true" />}
    </a>
  )
}
