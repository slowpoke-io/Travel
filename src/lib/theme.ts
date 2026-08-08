/**
 * 主題設定。
 *
 * 刻意不標 'use client'：root layout 是 server component，要從 cookie 讀出
 * 目前的主題再渲染到 <html> 上。裡面沒有任何 hook，兩邊都能 import。
 *
 * 兩個維度是分開的：
 *   data-theme  哪一套配色（platform / cartography / tideline / redeye）
 *   data-mode   淺色、深色、或跟隨系統
 *
 * 分開之後，新增一套主題不會讓「模式」的組合數翻倍，
 * 每套主題只要各寫一份淺色與一份深色的 token 即可。
 */

export const THEMES = [
  {
    id: 'platform',
    label: '月台',
    en: 'Platform',
    hint: '車站看板。鐵道藍與號誌琥珀，數字最好讀',
    /** 淺色 / 深色時瀏覽器 UI 的顏色（狀態列、分頁標籤） */
    browser: { light: '#f7f8fa', dark: '#22262b' },
  },
  {
    id: 'cartography',
    label: '紙圖',
    en: 'Cartography',
    hint: '等高線圖。暖白的紙、帶綠的墨、測量標記硃紅',
    browser: { light: '#f9f7f1', dark: '#2b302c' },
  },
  {
    id: 'tideline',
    label: '潮間帶',
    en: 'Tideline',
    hint: '海岸線。淡沙、深海墨綠、曬淡的珊瑚',
    browser: { light: '#f9f7f0', dark: '#27333a' },
  },
  {
    id: 'redeye',
    label: '夜航',
    en: 'Redeye',
    hint: '機艙暗光。極光青與閱讀燈琥珀，深色為主',
    browser: { light: '#f5f5f8', dark: '#22242f' },
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type ThemeMode = 'light' | 'dark' | 'system'

export const DEFAULT_THEME: ThemeId = 'platform'
export const DEFAULT_MODE: ThemeMode = 'system'

export const THEME_COOKIE = 'trip-theme'
export const MODE_COOKIE = 'trip-mode'

const THEME_IDS = THEMES.map((t) => t.id) as readonly string[]

export function isThemeId(value: string | undefined | null): value is ThemeId {
  return !!value && THEME_IDS.includes(value)
}

export function isThemeMode(
  value: string | undefined | null,
): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function themeMeta(id: ThemeId) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

/**
 * 在 <head> 最前面同步執行的一小段程式。
 *
 * cookie 通常就夠了（伺服器端已經把 data-theme 寫好），但有兩種情況會漏：
 * 分享連結那類不帶 cookie 的請求、以及使用者在別的分頁改了偏好。
 * 這段用 localStorage 補上，而且必須是同步的 —— 一旦晚於首次繪製，
 * 就會看到主題閃一下才換過去。
 *
 * mode='system' 時要把實際結果算出來寫進 data-resolved-mode，
 * 地圖圖磚與 meta[theme-color] 都靠它判斷，不能只靠 CSS 的 media query。
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('${THEME_COOKIE}');
var m=localStorage.getItem('${MODE_COOKIE}');
if(t&&${JSON.stringify(THEME_IDS)}.indexOf(t)>=0)d.setAttribute('data-theme',t);
if(m==='light'||m==='dark'||m==='system')d.setAttribute('data-mode',m);
var mode=d.getAttribute('data-mode')||'${DEFAULT_MODE}';
var resolved=mode==='system'
  ?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')
  :mode;
d.setAttribute('data-resolved-mode',resolved);
}catch(e){}})()`
