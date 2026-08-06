'use client'

import { useEffect, useMemo } from 'react'
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'

import type { MappedActivity } from '@/components/map/leaflet-map'
import { publicEnv } from '@/lib/env'
import { cn } from '@/lib/utils'

/**
 * 「地圖」分頁專用的 Google 地圖。
 *
 * 為什麼這裡跟每日行程的地圖用不同引擎：
 *   - 每日行程的地圖只是輔助看動線，Leaflet 夠用又不花錢
 *   - 「地圖」分頁是專門看地圖的地方，Google 的圖資（尤其是海外的店家、
 *     大眾運輸與街道細節）明顯較完整，值得用掉 API 額度
 *
 * 沒有設定金鑰時，呼叫端會自動退回 Leaflet（見 trip-map-view.tsx）。
 */

/** 地圖載入後自動框住所有標記 */
function FitBounds({ points }: { points: MappedActivity[] }) {
  const map = useMap()

  useEffect(() => {
    if (!map || points.length === 0) return

    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng })
      map.setZoom(15)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    for (const p of points) bounds.extend({ lat: p.lat, lng: p.lng })
    map.fitBounds(bounds, 48)
  }, [map, points])

  return null
}

/** 依順序把標記連成虛線；虛線比實線更像「順序」而不是「實際路線」 */
function RouteLine({
  path,
  color,
}: {
  path: { lat: number; lng: number }[]
  color: string
}) {
  const map = useMap()

  useEffect(() => {
    if (!map || path.length < 2) return

    const polyline = new google.maps.Polyline({
      path,
      map,
      strokeColor: color,
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.8,
            strokeColor: color,
            scale: 3,
          },
          offset: '0',
          repeat: '12px',
        },
      ],
    })

    return () => polyline.setMap(null)
  }, [map, path, color])

  return null
}

function MapBody({
  points,
  selectedId,
  onSelect,
  showRoute,
}: {
  points: MappedActivity[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  showRoute: boolean
}) {
  const path = useMemo(
    () => points.map((p) => ({ lat: p.lat, lng: p.lng })),
    [points],
  )

  return (
    <Map
      mapId={publicEnv.googleMapsMapId || undefined}
      defaultCenter={{ lat: points[0].lat, lng: points[0].lng }}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI
      zoomControl
      className="size-full"
    >
      <FitBounds points={points} />
      {showRoute ? <RouteLine path={path} color={points[0].color} /> : null}

      {points.map((point) => (
        <AdvancedMarker
          key={point.id}
          position={{ lat: point.lat, lng: point.lng }}
          title={point.title}
          onClick={onSelect ? () => onSelect(point.id) : undefined}
        >
          <span
            className={cn(
              'flex size-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md transition-transform',
              selectedId === point.id && 'scale-125',
            )}
            style={{ backgroundColor: point.color }}
          >
            {point.order}
          </span>
        </AdvancedMarker>
      ))}
    </Map>
  )
}

export function GoogleTripMap({
  points,
  className,
  selectedId,
  onSelect,
  showRoute = true,
}: {
  points: MappedActivity[]
  className?: string
  selectedId?: string | null
  onSelect?: (id: string) => void
  showRoute?: boolean
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <APIProvider
        apiKey={publicEnv.googleMapsApiKey}
        language="zh-TW"
        region="TW"
      >
        <MapBody
          points={points}
          selectedId={selectedId}
          onSelect={onSelect}
          showRoute={showRoute}
        />
      </APIProvider>
    </div>
  )
}
