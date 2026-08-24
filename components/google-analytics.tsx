"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"

const MEASUREMENT_ID = "G-PBKCJ68RYL"

export function GoogleAnalytics() {
  const pathname = usePathname()

  if (pathname.startsWith("/obs/")) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}', { anonymize_ip: true });`}
      </Script>
    </>
  )
}
