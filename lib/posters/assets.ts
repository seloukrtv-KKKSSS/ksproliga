/** Use the existing same-origin optimizer for badge providers without canvas CORS. */
export function getPosterLogoSource(source: string, width: 256 | 1920 = 256): string {
  let url: URL
  try {
    url = new URL(source)
  } catch {
    return source
  }

  if (url.protocol !== "https:" || url.port || url.username || url.password) return source
  const supported = url.hostname === "imgpx.com"
    || (url.hostname === "kdfa.if.ua" && url.pathname.startsWith("/storage/teams/"))
  if (!supported) return source

  // Fragments do not identify a different image and are not sent upstream.
  url.hash = ""
  return `/_next/image?url=${encodeURIComponent(url.href)}&w=${width}&q=85`
}
