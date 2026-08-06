'use client'

import { useEffect, useSyncExternalStore } from 'react'

import { publicEnv } from '@/lib/env'

/**
 * 載入 Google Maps JS API 的 places 函式庫。
 *
 * 地圖本身改用 Leaflet + OpenStreetMap（不需要金鑰）之後，Google 只剩下
 * 兩個用途：地點搜尋（自動帶入名稱／地址／座標）與導航連結。導航只是普通的
 * 外部網址，所以真正需要載入 SDK 的就只有這裡的地點搜尋。
 *
 * 之所以不再用 @vis.gl/react-google-maps：那個套件的價值在於它的 <Map>
 * 元件，現在已經不需要了，為了一個 loader 留著整包相依並不划算。
 */

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

// 模組層級的共享狀態：同一頁可能有多個搜尋框，script 只能載入一次
let loadState: LoadState = 'idle'
let loadPromise: Promise<void> | null = null
const subscribers = new Set<() => void>()

function setState(next: LoadState) {
  loadState = next
  for (const notify of subscribers) notify()
}

function loadScript(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const key = publicEnv.googleMapsApiKey
    if (!key) {
      setState('error')
      reject(new Error('未設定 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'))
      return
    }

    // 已經載入過（例如從 bfcache 回來）
    if (typeof google !== 'undefined' && google.maps?.places) {
      setState('ready')
      resolve()
      return
    }

    setState('loading')

    const script = document.createElement('script')
    const params = new URLSearchParams({
      key,
      // loading=async 是 Google 目前建議的載入方式，可避免阻塞渲染
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
        // 新版 API 用 importLibrary 取得 places，而不是等 callback
        await google.maps.importLibrary('places')
        setState('ready')
        resolve()
      } catch (e) {
        setState('error')
        reject(e)
      }
    }
    script.onerror = () => {
      setState('error')
      reject(new Error('Google Maps 載入失敗'))
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
const getServerSnapshot = (): LoadState => 'idle'

/**
 * 回傳 places 函式庫的載入狀態。
 * 沒有設定 API 金鑰時直接回 'error'，呼叫端應改為顯示手動輸入。
 *
 * 用 useSyncExternalStore 而不是 useEffect + setState：載入狀態是模組層級的
 * 外部狀態（多個搜尋框共用一份），這正是這個 hook 的用途，也避免了
 * 在 effect 裡 setState 造成的串連渲染。
 */
export function useGooglePlaces(enabled: boolean): LoadState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (!enabled) return
    loadScript().catch(() => {
      /* 狀態已經在 loadScript 內設成 error */
    })
  }, [enabled])

  return enabled ? state : 'error'
}
