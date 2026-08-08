'use client'

/**
 * 把 `var(--x)` 解析成實際的色值。
 *
 * 分類色改成 CSS 變數之後，大部分地方都沒問題 —— inline style、divIcon 的
 * HTML，這些最後都是 CSS，變數自然會解析。但有兩種地方吃不了變數：
 *
 *   - Google Maps 的選項（strokeColor 這類），那是 JS 物件不是樣式
 *   - SVG 的呈現屬性（Leaflet 的 Polyline 會直接 setAttribute('stroke', …)）
 *
 * 這兩種要先在 JS 端把值讀出來。呼叫端要在主題改變時重新解析 ——
 * 用 useTheme() 讓元件重新渲染就會自動再跑一次。
 */
export function resolveCssColor(value: string): string {
  if (typeof window === 'undefined') return value
  const name = value.match(/^var\((--[\w-]+)\)$/)?.[1]
  if (!name) return value
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    value
  )
}
