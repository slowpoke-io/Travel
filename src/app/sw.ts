import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { CacheFirst, ExpirationPlugin, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * Service Worker。
 *
 * 離線範圍刻意限縮在「已瀏覽過的頁面與圖片可以再看一次」——
 * 離線編輯需要本地資料庫與衝突合併，不在這一版的範圍內。
 * 所有寫入都走網路，離線時 Server Action 會失敗並跳出提示。
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Supabase Storage 的圖片：路徑含隨機 UUID 且內容不會被覆寫，
      // 所以可以放心用 CacheFirst 長期快取 —— 這也是飛航模式下還看得到照片的原因。
      matcher: ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
      handler: new CacheFirst({
        cacheName: 'trip-media',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 300,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()
