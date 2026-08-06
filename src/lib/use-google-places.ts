'use client'

import { useEffect, useSyncExternalStore } from 'react'

import { publicEnv } from '@/lib/env'

/**
 * 載入 Google Maps JS API 的 places 函式庫。
 *
 * 地圖顯示分別由 Leaflet（每日行程）與 Google（地圖分頁）負責，這裡只處理
 * 地點搜尋 —— 那是 Google 真正不可取代的部分（搜尋地點取得座標）。
 * 導航與「在地圖開啟」是純外部網址，不需要載入 SDK。
 */

declare global {
  interface Window {
    /** Google Maps 在金鑰被拒時會呼叫這個全域函式 */
    gm_authFailure?: () => void
  }
}

export type PlacesLoadState =
  | 'idle'
  | 'loading'
  | 'ready'
  /** 根本沒設定金鑰 */
  | 'no-key'
  /** 有金鑰但 Google 拒絕：API 未啟用、網域限制不符、金鑰無效等 */
  | 'rejected'

// 模組層級的共享狀態：同一頁可能有多個搜尋框，script 只能載入一次
let loadState: PlacesLoadState = 'idle'
let loadPromise: Promise<void> | null = null
const subscribers = new Set<() => void>()

function setState(next: PlacesLoadState) {
  loadState = next
  for (const notify of subscribers) notify()
}

function loadScript(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const key = publicEnv.googleMapsApiKey
    if (!key) {
      setState('no-key')
      reject(new Error('NO_KEY'))
      return
    }

    // 已經載入過（例如從 bfcache 回來）
    if (typeof google !== 'undefined' && google.maps?.places) {
      setState('ready')
      resolve()
      return
    }

    setState('loading')

    /*
     * Google 在金鑰被拒時（API 未啟用、HTTP 參照網址不符、金鑰無效）
     * 不會讓 script 載入失敗，而是呼叫這個全域 callback。
     * 沒有攔它的話，畫面只會出現一個永遠搜不到東西的輸入框，
     * 使用者完全不知道發生什麼事。
     */
    window.gm_authFailure = () => {
      console.error(
        '[Google Maps] 金鑰被拒。請確認 Google Cloud Console 中：' +
          '(1) Maps JavaScript API 與 Places API (New) 都已啟用，' +
          '(2) 金鑰的「API 限制」有包含這兩個 API，' +
          '(3) 金鑰的「HTTP 參照網址限制」包含目前的網域。',
      )
      setState('rejected')
    }

    const script = document.createElement('script')
    const params = new URLSearchParams({
      key,
      loading: 'async',
      libraries: 'places',
      language: 'zh-TW',
      region: 'TW',
      v: 'weekly',
    })
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`
    script.async = true

    script.onload = async () => {
      try {
        await google.maps.importLibrary('places')
        // gm_authFailure 可能比 importLibrary 晚觸發，別覆寫掉它的結果
        if (loadState !== 'rejected') setState('ready')
        resolve()
      } catch (e) {
        console.error('[Google Maps] places 函式庫載入失敗', e)
        setState('rejected')
        reject(e)
      }
    }
    script.onerror = () => {
      setState('rejected')
      reject(new Error('SCRIPT_LOAD_FAILED'))
    }

    document.head.appendChild(script)
  })

  return loadPromise
}

function subscribe(notify: () => void) {
  subscribers.add(notify)
  return () => {
    subscribers.delete(notify)
  }
}

const getSnapshot = () => loadState
// SSR 時永遠是尚未載入；script 只可能在瀏覽器端存在
const getServerSnapshot = (): PlacesLoadState => 'idle'

/**
 * 回傳 places 函式庫的載入狀態。
 *
 * 用 useSyncExternalStore 而不是 useEffect + setState：載入狀態是模組層級的
 * 外部狀態（多個搜尋框共用一份），這正是這個 hook 的用途，也避免了
 * 在 effect 裡 setState 造成的串連渲染。
 */
export function useGooglePlaces(enabled: boolean): PlacesLoadState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (!enabled) return
    loadScript().catch(() => {
      /* 狀態已經在 loadScript 內設好 */
    })
  }, [enabled])

  return enabled ? state : 'no-key'
}
