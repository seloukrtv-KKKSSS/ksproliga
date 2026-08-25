const SITE_ORIGIN = "https://ksliga.com"

export type ReturnToParam = string | string[] | undefined

export function getSafeReturnTo(value: ReturnToParam, fallback: string) {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return fallback
  if (candidate.includes("\\") || /[\u0000-\u001F\u007F]/.test(candidate)) return fallback

  try {
    const url = new URL(candidate, SITE_ORIGIN)
    if (url.origin !== SITE_ORIGIN) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function withReturnTo(href: string, returnTo: string) {
  const url = new URL(href, SITE_ORIGIN)
  url.searchParams.set("returnTo", returnTo)
  return `${url.pathname}${url.search}${url.hash}`
}
