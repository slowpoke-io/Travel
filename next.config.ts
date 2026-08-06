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
