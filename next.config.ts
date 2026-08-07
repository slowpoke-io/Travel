import type { NextConfig } from 'next'

import { supabaseImageOrigin } from './src/lib/env'

const origin = supabaseImageOrigin()

/**
 * Service Worker 不在這裡處理。
 *
 * Next 16 預設使用 Turbopack，而 `@serwist/next` 的 webpack 外掛不支援它。
 * 因此改用 Serwist 的 configurator 模式：SW 由 `serwist build` 這個獨立步驟
 * 產生（見 serwist.config.ts 與 package.json 的 build script），
 * 註冊則由 <ServiceWorkerRegistrar> 在瀏覽器端完成。
 */
const nextConfig: NextConfig = {
  // 上層目錄有其他專案的 lockfile，明確指定根目錄避免 Next 猜錯
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,

  experimental: {
    /*
      Client Router Cache。

      dynamic 預設是 0 秒 —— 也就是完全不快取，所以在分頁之間來回（行程 ↔
      儲備區 ↔ 地圖）每一次都會重新在伺服器渲染，即使那幾頁用的是同一份
      loadTripBundle。設成 30 秒之後，短時間內回到看過的分頁是瞬間的。

      任何異動後我們都會呼叫 router.refresh()，那會使快取失效，所以自己
      改的東西一定看得到最新的。代價是別的裝置同時改動時，最多 30 秒後才會
      反映 —— 對個人的旅遊規劃工具而言可以接受。
    */
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  images: {
    // Supabase Storage 的公開圖片（bucket 為 public，URL 穩定可快取）
    remotePatterns: origin
      ? [
          {
            protocol: origin.protocol,
            hostname: origin.hostname,
            port: origin.port,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
}

export default nextConfig
