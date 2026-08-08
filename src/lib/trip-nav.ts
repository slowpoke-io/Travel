/**
 * 「行程 / 儲備區 / 地圖」三個分頁的網址處理。
 *
 * 這三個分頁看的是同一份資料（loadTripBundle 一次就全拿到了），差別只在
 * 呈現方式。原本它們是三條各自獨立的路由，切過去就等於叫伺服器把同樣的
 * 六個查詢再跑一次 —— 資料明明已經在手上了。
 *
 * 現在它們共用同一個 catch-all 路由，切換分頁只改網址（history.pushState），
 * 不觸發 Next 的導航，因此完全不會有網路往返。Next 會把 pushState 同步到
 * usePathname，所以「目前在哪個分頁」直接從網址讀就好，不需要另外存狀態，
 * 上一頁／下一頁與分享網址也都照常運作。
 */
export type TripTab = 'day' | 'backlog' | 'map' | 'expense'

/*
  這個檔案刻意「不」標 'use client'：路由的 page 是 server component，
  要用 parseTripView 解析網址。裡面沒有任何 hook，只有純函式與一個在
  呼叫時才碰 window 的 pushTripView，兩邊都能安全 import。
*/

export type TripView =
  | { tab: 'day'; dayIndex: number }
  | { tab: 'backlog' }
  | { tab: 'map' }
  | { tab: 'expense' }

/**
 * 從路由的 catch-all 片段解析出要顯示哪個分頁。
 * 認不得的路徑回傳 null，由呼叫端決定 404。
 */
export function parseTripView(segments: string[]): TripView | null {
  if (segments.length === 1 && segments[0] === 'backlog') return { tab: 'backlog' }
  if (segments.length === 1 && segments[0] === 'map') return { tab: 'map' }
  if (segments.length === 1 && segments[0] === 'expenses') return { tab: 'expense' }
  if (segments.length === 2 && segments[0] === 'd') {
    const index = Number(segments[1])
    if (Number.isInteger(index) && index >= 1) return { tab: 'day', dayIndex: index }
  }
  return null
}

/** 從完整網址解析（client 端用；pushState 之後 usePathname 會跟著變） */
export function tripViewFromPathname(pathname: string): TripView {
  if (/\/backlog\/?$/.test(pathname)) return { tab: 'backlog' }
  if (/\/map\/?$/.test(pathname)) return { tab: 'map' }
  if (/\/expenses\/?$/.test(pathname)) return { tab: 'expense' }
  const m = pathname.match(/\/d\/(\d+)\/?$/)
  if (m) return { tab: 'day', dayIndex: Number(m[1]) }
  return { tab: 'day', dayIndex: 1 }
}

export function tripViewHref(base: string, view: TripView): string {
  if (view.tab === 'day') return `${base}/d/${view.dayIndex}`
  // 網址用複數的 /expenses，讀起來比 /expense 自然
  if (view.tab === 'expense') return `${base}/expenses`
  return `${base}/${view.tab}`
}

/**
 * 換分頁／換日期：只改網址，不做導航。
 *
 * 保留 search params，篩選條件才不會在切換分頁時被清掉。
 */
export function pushTripView(base: string, view: TripView) {
  const href = tripViewHref(base, view)
  if (window.location.pathname === href) return
  window.history.pushState(null, '', `${href}${window.location.search}`)
}
