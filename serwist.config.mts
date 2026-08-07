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
  /*
    離線頁由 precachePrerendered 一併收進來就好，不要再自己加一次。

    /offline 是預先渲染的靜態頁，precachePrerendered 會帶著 revision hash
    把它放進 manifest。如果這裡再補一筆 { url: '/offline', revision: null }，
    同一個 URL 就會出現兩筆不同 revision 的項目，Serwist 會丟出
    add-to-cache-list-conflicting-entries —— 那是在 Service Worker 的
    最上層丟出來的，整個 SW 註冊直接失敗，PWA 與離線快取全部不會生效。
  */
  precachePrerendered: true,

  /*
    _buildManifest.js / _ssgManifest.js 是 Pages Router 的產物。
    `next build` 仍然會在 .next/static/<buildId>/ 產出它們，但這個 App Router
    專案部署到 Vercel 之後那兩個檔案並不存在，precache 抓到 404 就會丟出
    bad-precaching-response，install 失敗、Service Worker 永遠停在 installing。
    本機 `next start` 讀得到檔案，所以只有線上才會壞 —— 一定要實際部署後驗。
  */
  globIgnores: ['.next/static/*/_buildManifest.js', '.next/static/*/_ssgManifest.js'],
}))
