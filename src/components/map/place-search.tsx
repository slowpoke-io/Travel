'use client'

import { useEffect, useRef } from 'react'
import { Search, TriangleAlert } from 'lucide-react'

import { useGooglePlaces } from '@/lib/use-google-places'

export type PlaceResult = {
  placeName: string
  address: string | null
  lat: number | null
  lng: number | null
  googlePlaceId: string | null
}

/**
 * Google Places 地點搜尋。
 *
 * 地圖顯示改用 Leaflet 之後，Google 在這個 App 只負責兩件事：
 * 這裡的地點搜尋（自動帶入名稱、地址與座標）以及外部導航連結。
 *
 * 使用新版的 `PlaceAutocompleteElement`（web component）——
 * 舊的 `google.maps.places.Autocomplete` 自 2025-03-01 起不再開放新客戶使用。
 */
export function PlaceSearch({
  onSelect,
  enabled,
  placeholder = '搜尋地點，例如「淺草寺」',
}: {
  onSelect: (place: PlaceResult) => void
  enabled: boolean
  placeholder?: string
}) {
  const state = useGooglePlaces(enabled)
  const containerRef = useRef<HTMLDivElement>(null)

  // 用 ref 保存最新的 callback，避免 element 因為 callback 每次都是新函式而重建
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (state !== 'ready' || !containerRef.current) return

    const container = containerRef.current
    const Element = (
      google.maps.places as unknown as {
        PlaceAutocompleteElement: new (opts?: object) => HTMLElement
      }
    ).PlaceAutocompleteElement
    if (!Element) return

    const element = new Element()
    element.setAttribute('placeholder', placeholder)
    element.style.width = '100%'
    container.replaceChildren(element)

    async function handleSelect(event: Event) {
      const prediction = (
        event as unknown as {
          placePrediction?: {
            toPlace: () => {
              fetchFields: (opts: { fields: string[] }) => Promise<unknown>
              displayName?: string
              formattedAddress?: string
              id?: string
              location?: { lat: () => number; lng: () => number }
            }
          }
        }
      ).placePrediction
      if (!prediction) return

      const place = prediction.toPlace()
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'id'],
      })

      onSelectRef.current({
        placeName: place.displayName ?? '',
        address: place.formattedAddress ?? null,
        // 座標仍然由 Google 提供（Leaflet 只負責把它畫出來）
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
        googlePlaceId: place.id ?? null,
      })
    }

    element.addEventListener('gmp-select', handleSelect)
    return () => {
      element.removeEventListener('gmp-select', handleSelect)
      container.replaceChildren()
    }
  }, [state, placeholder])

  if (state === 'no-key') {
    return (
      <div className="text-muted-foreground flex items-start gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          地點搜尋需要 Google Maps 金鑰。可以先手動輸入名稱與地址，
          之後補上金鑰就能自動帶入座標。
        </span>
      </div>
    )
  }

  /*
    有金鑰但被 Google 拒絕。這跟「沒有金鑰」是完全不同的問題，訊息必須分開 ——
    否則使用者會一直去找那把明明就存在的金鑰。
  */
  if (state === 'rejected') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-dashed border-amber-500/40 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium">Google 拒絕了這把金鑰。</strong>
          <br />
          請到 Google Cloud Console 確認：Maps JavaScript API 與 Places API
          (New) 都已「啟用」、金鑰的「API 限制」有包含這兩項、且「HTTP
          參照網址限制」包含目前的網域。詳細錯誤在瀏覽器主控台。
          <br />
          在那之前可以先手動輸入名稱與地址。
        </span>
      </div>
    )
  }

  if (state !== 'ready') {
    return (
      <div className="text-muted-foreground flex h-11 items-center gap-2 rounded-md border px-3 text-sm">
        <Search className="size-4 animate-pulse" aria-hidden />
        載入地點搜尋…
      </div>
    )
  }

  return <div ref={containerRef} className="w-full [&_*]:font-sans" />
}
