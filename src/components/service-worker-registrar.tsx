'use client'

import { SerwistProvider } from '@serwist/next/react'

/**
 * 在瀏覽器端註冊 Service Worker。
 *
 * 開發模式不註冊 —— 否則舊的快取會蓋掉剛改好的程式碼，debug 時非常痛苦。
 */
export function ServiceWorkerRegistrar({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === 'development'}
      reloadOnOnline
    >
      {children}
    </SerwistProvider>
  )
}
