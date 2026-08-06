import { serwist } from '@serwist/next/config'

/**
 * Serwist configurator 模式。
 *
 * 由 `serwist build` 在 `next build` 之後執行，把 Next 產生的靜態資源
 * 掃進 precache manifest，再把 src/app/sw.ts 打包成 public/sw.js。
 *
 * 之所以不用 `@serwist/next` 的 webpack 外掛：Next 16 預設是 Turbopack，
 * 那個外掛不支援。這個模式與打包器無關，所以兩邊都能用。
 *
 * 注意不要覆寫 globDirectory —— 它預設為專案根目錄，而內建的 globPatterns
 * （`.next/static/**`、`public/**`）是相對於它的。
 */
export default serwist.withNextConfig(() => ({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // 離線頁要先快取起來，否則斷線時連 fallback 都拿不到
  additionalPrecacheEntries: [{ url: '/offline', revision: null }],
  precachePrerendered: true,
}))
