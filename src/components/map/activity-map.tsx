'use client'

import { useEffect, useMemo } from 'react'
import {
  AdvancedMarker,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'
import { MapPinOff } from 'lucide-react'

import { RoutePolyline } from '@/components/map/route-polyline'
import { publicEnv } from '@/lib/env'
import type { ActivityWithRelations } from '@/lib/queries'
import { cn } from '@/lib/utils'

export type MappedActivity = {
  id: string
  title: string
  lat: number
  lng: number
  /** 標記上顯示的序號 */
  order: number
  color: string
}

/** 從行程陣列中挑出有座標的，並附上序號 */
export function toMappedActivities(
  activities: ActivityWithRelations[],
  color: string,
): MappedActivity[] {
  const mapped: MappedActivity[] = []
  activities.forEach((a, index) => {
    if (a.lat === null || a.lng === null) return
    mapped.push({
      id: a.id,
      title: a.title,
      lat: a.lat,
      lng: a.lng,
      order: index + 1,
      color,
    })
  })
  return mapped
}

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

export function ActivityMap({
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
  const path = useMemo(
    () => points.map((p) => ({ lat: p.lat, lng: p.lng })),
    [points],
  )

  if (points.length === 0) {
    return (
      <div
        className={cn(
          'bg-muted text-muted-foreground flex flex-col items-center justify-center gap-2 text-xs',
          className,
        )}
      >
        <MapPinOff className="size-5" aria-hidden />
        這些行程還沒有地點資訊
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
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
        {showRoute ? (
          <RoutePolyline path={path} color={points[0].color} />
        ) : null}

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
    </div>
  )
}
