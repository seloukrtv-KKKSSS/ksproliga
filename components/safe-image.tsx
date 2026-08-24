import Image, { type ImageProps } from "next/image"

const optimizedHosts = new Set([
  "images.unsplash.com",
  "ksliga.com",
  "tkshtyrfwvihpzsnbmvx.supabase.co",
])

const shouldSkipOptimization = (src: ImageProps["src"]) => {
  if (typeof src !== "string" || src.startsWith("/") || src.startsWith("data:")) return false

  try {
    return !optimizedHosts.has(new URL(src).hostname)
  } catch {
    return true
  }
}

export function SafeImage({ src, alt, unoptimized, ...props }: ImageProps) {
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={unoptimized ?? shouldSkipOptimization(src)}
    />
  )
}
