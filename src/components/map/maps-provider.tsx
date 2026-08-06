'use client'

import { APIProvider } from '@vis.gl/react-google-maps'

import { publicEnv } from '@/lib/env'

/**
 * 只有設定了 API 金鑰時才載入 Google Maps。
 *
 * 沒設定的話整個 App 仍然可用 —— 地點改為手動輸入、地圖區塊顯示提示，
 * 而不是壞掉的空白區或滿版錯誤。
 */
export function MapsProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  if (!enabled) return <>{children}</>

  return (
    <APIProvider
      apiKey={publicEnv.googleMapsApiKey}
      libraries={['places', 'marker']}
      language="zh-TW"
      region="TW"
    >
      {children}
    </APIProvider>
  )
}
