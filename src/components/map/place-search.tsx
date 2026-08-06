'use client'

import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Search } from 'lucide-react'

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
 * 使用新版的 `PlaceAutocompleteElement`（web component）—— 舊的
 * `google.maps.places.Autocomplete` 自 2025-03-01 起不再開放新客戶使用。
 *
 * 搜尋選定後會自動帶入名稱、地址與座標，使用者不需要手動查經緯度。
 */
export function PlaceSearch({
  onSelect,
  placeholder = '搜尋地點，例如「淺草寺」',
}: {
  onSelect: (place: PlaceResult) => void
  placeholder?: string
}) {
  const placesLib = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  // 用 ref 保存最新的 callback，避免 element 因為 callback 每次都是新函式而重建
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!placesLib || !containerRef.current) return

    const container = containerRef.current
    // 型別定義尚未涵蓋這個新的 web component
    const Element = (
      placesLib as unknown as {
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
  }, [placesLib, placeholder])

  if (!placesLib) {
    return (
      <div className="text-muted-foreground flex h-11 items-center gap-2 rounded-md border px-3 text-sm">
        <Search className="size-4 animate-pulse" aria-hidden />
        載入地點搜尋…
      </div>
    )
  }

  return <div ref={containerRef} className="w-full [&_*]:font-sans" />
}
