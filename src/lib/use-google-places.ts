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

/** script 載入完成後 Google 會呼叫的全域 callback 名稱 */
const CALLBACK_NAME = '__initGooglePlaces'

declare global {
  interface Window {
    /** Google Maps 在金鑰被拒時會呼叫這個全域函式 */
    gm_authFailure?: () => void
    [CALLBACK_NAME]?: () => void
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

    /*
     * 用 callback 而不是 script.onload：
     *
     * loading=async 時，onload 只代表「bootstrap 檔下載完了」，此時 API 還在
     * 非同步載入子資源，google.maps.places 尚未就緒。Google 要求搭配 callback，
     * 它會在真正可用之後才呼叫。
     *
     * 也不能用 google.maps.importLibrary —— 那是 inline bootstrap loader
     * （(g=>{...})({key}) 那段程式碼）才會建立的函式，用一般 script 標籤
     * 載入時它並不存在。改成在 URL 帶 libraries=places，載入後直接使用
     * google.maps.places。
     */
    window[CALLBACK_NAME] = () => {
      delete window[CALLBACK_NAME]
      // gm_authFailure 可能先觸發，別覆寫掉它的結果
      if (loadState === 'rejected') {
        reject(new Error('AUTH_FAILURE'))
        return
      }
      if (!google.maps?.places?.PlaceAutocompleteElement) {
        console.error(
          '[Google Maps] places 函式庫已載入，但找不到 PlaceAutocompleteElement。' +
            '請確認 Places API (New) 已啟用。',
        )
        setState('rejected')
        reject(new Error('PLACES_UNAVAILABLE'))
        return
      }
      setState('ready')
      resolve()
    }

    const script = document.createElement('script')
    const params = new URLSearchParams({
      key,
      loading: 'async',
      libraries: 'places',
      callback: CALLBACK_NAME,
      language: 'zh-TW',
      region: 'TW',
      v: 'weekly',
    })
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`
    script.async = true

    script.onerror = () => {
      delete window[CALLBACK_NAME]
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
