import type { Metadata, Viewport } from 'next'
import { Noto_Sans_TC } from 'next/font/google'

import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: '旅程 · 旅遊規劃與紀錄',
    template: '%s · 旅程',
  },
  description:
    '規劃每一天的行程、拖曳排序、在地圖上看順序，並留下旅遊照片紀錄。',
  applicationName: '旅程',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '旅程',
  },
  formatDetection: { telephone: false },
  other: {
    // Next 會自己輸出標準的 mobile-web-app-capable，但不會輸出 iOS 專用的這個。
    // 少了它，從主畫面開啟時仍會帶著 Safari 的網址列，不是全螢幕的 App 樣子。
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  // 手機版為主：鎖住縮放，避免拖曳排序時誤觸雙指縮放
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant" className={`${notoSansTC.variable} h-full`}>
      <body className="bg-background text-foreground min-h-full antialiased">
        <ServiceWorkerRegistrar>{children}</ServiceWorkerRegistrar>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
