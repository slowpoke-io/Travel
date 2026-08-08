import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Noto_Sans_TC } from 'next/font/google'

import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar'
import { ThemeColorSync } from '@/components/theme/theme-color-sync'
import { Toaster } from '@/components/ui/sonner'
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  isThemeId,
  isThemeMode,
  MODE_COOKIE,
  THEME_COOKIE,
  THEME_INIT_SCRIPT,
} from '@/lib/theme'

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
  /*
    這裡只放一個保底值。實際的顏色由 ThemeColorSync 在 client 端依照
    目前的主題與模式改寫 —— 主題是使用者選的，靜態的 media query 追不上。
  */
  themeColor: '#f7f8fa',
  width: 'device-width',
  initialScale: 1,
  // 手機版為主：鎖住縮放，避免拖曳排序時誤觸雙指縮放
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  /*
    從 cookie 讀主題，讓伺服器渲染出來的 HTML 就已經是對的。
    只靠 localStorage 的話，第一次繪製會先閃一下預設主題才換過去。
  */
  const jar = await cookies()
  const theme = jar.get(THEME_COOKIE)?.value
  const mode = jar.get(MODE_COOKIE)?.value

  return (
    <html
      lang="zh-Hant"
      data-theme={isThemeId(theme) ? theme : DEFAULT_THEME}
      data-mode={isThemeMode(mode) ? mode : DEFAULT_MODE}
      className={`${notoSansTC.variable} h-full`}
      /*
        data-resolved-mode 由 THEME_INIT_SCRIPT 在 client 端補上，
        伺服器算不出使用者的系統偏好。這裡明講一聲，免得 React 抱怨對不起來。
      */
      suppressHydrationWarning
    >
      <head>
        {/* 必須是同步 script，而且要在任何樣式生效前跑完，否則會閃 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-background text-foreground min-h-full antialiased">
        <ThemeColorSync />
        <ServiceWorkerRegistrar>{children}</ServiceWorkerRegistrar>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
