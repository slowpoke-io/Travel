'use client'

import { useCallback, useSyncExternalStore } from 'react'

import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  isThemeId,
  isThemeMode,
  MODE_COOKIE,
  THEME_COOKIE,
  type ThemeId,
  type ThemeMode,
} from '@/lib/theme'

/**
 * 目前的主題與模式。
 *
 * 權威來源是 <html> 上的 data 屬性，不是 React state ——
 * 那些屬性由伺服器（cookie）與 THEME_INIT_SCRIPT 在 React 掛載之前就寫好了。
 * 這裡用 useSyncExternalStore 訂閱它們的變化，順序上才不會打架。
 */

type ThemeState = {
  theme: ThemeId
  mode: ThemeMode
  /** system 解析之後實際生效的模式。伺服器端算不出來，一律先當 light */
  resolved: 'light' | 'dark'
}

/*
  快取上一次的結果。useSyncExternalStore 要求 getSnapshot 在沒有變化時
  回傳「同一個」物件，否則會判定成無限更新。
*/
let cached: ThemeState = {
  theme: DEFAULT_THEME,
  mode: DEFAULT_MODE,
  resolved: 'light',
}

function read(): ThemeState {
  const el = document.documentElement
  const theme = el.getAttribute('data-theme')
  const mode = el.getAttribute('data-mode')
  const resolved = el.getAttribute('data-resolved-mode')

  const next: ThemeState = {
    theme: isThemeId(theme) ? theme : DEFAULT_THEME,
    mode: isThemeMode(mode) ? mode : DEFAULT_MODE,
    resolved: resolved === 'dark' ? 'dark' : 'light',
  }

  if (
    next.theme === cached.theme &&
    next.mode === cached.mode &&
    next.resolved === cached.resolved
  ) {
    return cached
  }
  cached = next
  return next
}

const SERVER_SNAPSHOT: ThemeState = {
  theme: DEFAULT_THEME,
  mode: DEFAULT_MODE,
  resolved: 'light',
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-mode', 'data-resolved-mode'],
  })

  // 模式是「跟隨系統」時，系統切換深淺色也要跟著更新
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onMedia = () => {
    applyResolved()
    onChange()
  }
  media.addEventListener('change', onMedia)

  return () => {
    observer.disconnect()
    media.removeEventListener('change', onMedia)
  }
}

/** 依照目前的 data-mode 算出實際生效的深淺，寫回 data-resolved-mode */
function applyResolved() {
  const el = document.documentElement
  const mode = el.getAttribute('data-mode') ?? DEFAULT_MODE
  const resolved =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode
  el.setAttribute('data-resolved-mode', resolved)
}

export function useTheme() {
  const state = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT)

  const setTheme = useCallback((theme: ThemeId) => {
    document.documentElement.setAttribute('data-theme', theme)
    persist(THEME_COOKIE, theme)
  }, [])

  const setMode = useCallback((mode: ThemeMode) => {
    document.documentElement.setAttribute('data-mode', mode)
    applyResolved()
    persist(MODE_COOKIE, mode)
  }, [])

  return { ...state, setTheme, setMode }
}

/*
  兩邊都寫。

  cookie 讓伺服器渲染時就知道要用哪一套（不會閃），
  localStorage 則補上 cookie 拿不到的情況 —— 例如分享連結那種
  不帶 cookie 的請求，或使用者在另一個分頁改了偏好。
*/
function persist(name: string, value: string) {
  try {
    localStorage.setItem(name, value)
  } catch {
    // 無痕模式可能會擋，失敗就算了，cookie 仍然有寫
  }
  // 一年。SameSite=Lax 就夠了，這不是跨站的東西
  document.cookie = `${name}=${value};path=/;max-age=31536000;SameSite=Lax`
}
