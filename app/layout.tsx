import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { PwaManager } from '@/components/pwa-manager'
import { GoogleAnalytics } from '@/components/google-analytics'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://ksliga.com'),
  title: 'KS LIGA — Karpiuk Sport League',
  description: 'Офіційний сайт KS LIGA — турнірна таблиця, календар, результати матчів та статистика гравців.',
  keywords: 'KS LIGA, футбол, ліга, турнір, матчі, результати',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KS LIGA',
  },
  icons: {
    icon: [
      { url: '/images/ks-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/ks-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/images/ks-logo.png',
    apple: '/images/ks-logo.png',
  },
  openGraph: {
    title: 'KS LIGA — Karpiuk Sport League',
    description: 'Турнірна таблиця, календар, результати та статистика',
    type: 'website',
    images: [{ url: '/og.png', width: 1733, height: 910, alt: 'KS LIGA — СПОРТИВНІ ПОДІЇ ОНЛАЙН!' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KS LIGA — Karpiuk Sport League',
    description: 'Турнірна таблиця, календар, результати та статистика',
    images: ['/og.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#eef6ff',
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
      </head>
      <body className={`${GeistSans.className} antialiased`}>
        <PwaManager />
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  )
}
