'use client'

import dynamic from 'next/dynamic'
import { MapPinOff } from 'lucide-react'

import type { ActivityWithRelations } from '@/lib/queries'
import { cn } from '@/lib/utils'
import type { MappedActivity } from '@/components/map/leaflet-map'

export type { MappedActivity }

/**
 * Leaflet 會直接操作 window / document，不能在 server 端渲染，
 * 所以動態載入並關掉 SSR。
 */
const LeafletMap = dynamic(
  () => import('@/components/map/leaflet-map').then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => <div className="bg-muted size-full animate-pulse" />,
  },
)

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

/**
 * 行程地圖。
 *
 * 底圖用 Leaflet + OpenStreetMap（CARTO 樣式），不需要任何 API 金鑰，
 * 所以地圖永遠可用。座標則是在新增行程時由 Google Places 帶入的。
 */
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
      <LeafletMap
        points={points}
        selectedId={selectedId}
        onSelect={onSelect}
        showRoute={showRoute}
      />
    </div>
  )
}
