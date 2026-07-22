import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'KS LIGA — Karpiuk Sport League',
  description: 'Офіційний сайт KS LIGA — турнірна таблиця, календар, результати матчів та статистика гравців.',
  keywords: 'KS LIGA, футбол, ліга, турнір, матчі, результати',
  openGraph: {
    title: 'KS LIGA — Karpiuk Sport League',
    description: 'Турнірна таблиця, календар, результати та статистика',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f172a',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="uk" className={GeistSans.variable}>
      <head>
        <link rel="preconnect" href="https://tkshtyrfwvihpzsnbmvx.supabase.co" />
        <link rel="dns-prefetch" href="https://tkshtyrfwvihpzsnbmvx.supabase.co" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-PBKCJ68RYL"></script>
        <script dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-PBKCJ68RYL');
            `}} />
      </head>
      <body className={`${GeistSans.className} antialiased`}>{children}</body>
    </html>
  )
}
