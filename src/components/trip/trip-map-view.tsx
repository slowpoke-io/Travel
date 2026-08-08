'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'

import {
  ActivityMap,
  toMappedActivities,
  type MappedActivity,
} from '@/components/map/activity-map'
import { GoogleTripMap } from '@/components/map/google-trip-map'
import { DayChip } from '@/components/trip/day-chip'
import { useBasePath } from '@/components/trip/trip-access'
import { isPlaceSearchEnabled } from '@/lib/env'
import { categoryMeta, dayColor } from '@/lib/constants'
import { formatDayLabel } from '@/lib/format'
import type { ActivityWithRelations } from '@/lib/queries'
import type { TripDayRow } from '@/lib/supabase/database.types'

const ALL = 'all'

/**
 * 全程地圖。可切換「全部」或單一天。
 * 「全部」模式每天用不同顏色，並且不畫連線 —— 跨天連線只會讓畫面變亂。
 *
 * 這個分頁用 Google 地圖：它是專門看地圖的地方，Google 的圖資（海外店家、
 * 大眾運輸、街道細節）明顯較完整，值得用掉 API 額度。每日行程頁的地圖只是
 * 輔助確認動線，維持用 Leaflet。
 * 沒有設定金鑰時這裡會自動退回 Leaflet，不會變成空白畫面。
 */
export function TripMapView({
  days,
  byDay,
}: {
  days: TripDayRow[]
  byDay: Record<string, ActivityWithRelations[]>
}) {
  const base = useBasePath()
  const useGoogle = isPlaceSearchEnabled()
  const [selectedDay, setSelectedDay] = useState<string>(ALL)
  const [focusId, setFocusId] = useState<string | null>(null)

  const points: MappedActivity[] = useMemo(() => {
    if (selectedDay === ALL) {
      return days.flatMap((day) =>
        toMappedActivities(byDay[day.id] ?? [], dayColor(day.day_index)),
      )
    }
    const day = days.find((d) => d.id === selectedDay)
    if (!day) return []
    return toMappedActivities(byDay[day.id] ?? [], dayColor(day.day_index))
  }, [selectedDay, days, byDay])

  const listed = useMemo(() => {
    if (selectedDay === ALL) return []
    return byDay[selectedDay] ?? []
  }, [selectedDay, byDay])

  const focused = focusId
    ? Object.values(byDay)
        .flat()
        .find((a) => a.id === focusId)
    : null

  return (
    <div className="flex flex-col">
      <div className="no-scrollbar overflow-x-auto border-b">
        <div className="flex w-max gap-1.5 px-4 py-2">
          <DayChip
            active={selectedDay === ALL}
            onClick={() => setSelectedDay(ALL)}
            label="全部"
          />
          {days.map((day) => (
            <DayChip
              key={day.id}
              active={selectedDay === day.id}
              onClick={() => setSelectedDay(day.id)}
              label={`D${day.day_index}`}
              sub={day.date ? formatDayLabel(day.date) : undefined}
              color={dayColor(day.day_index)}
            />
          ))}
        </div>
      </div>

      {useGoogle ? (
        <GoogleTripMap
          points={points}
          selectedId={focusId}
          onSelect={setFocusId}
          showRoute={selectedDay !== ALL}
          className="h-[52dvh] w-full"
        />
      ) : (
        <ActivityMap
          points={points}
          selectedId={focusId}
          onSelect={setFocusId}
          showRoute={selectedDay !== ALL}
          className="h-[52dvh] w-full"
        />
      )}

      {/* 點地圖標記後彈出的小卡 */}
      {focused ? (
        <Link
          href={`${base}/a/${focused.id}`}
          className="bg-card active:bg-muted flex items-center gap-3 border-b px-4 py-3"
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: categoryMeta(focused.category).color }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {focused.title}
            </span>
            {focused.address ? (
              <span className="text-muted-foreground block truncate text-xs">
                {focused.address}
              </span>
            ) : null}
          </span>
          <ChevronRight className="text-muted-foreground size-4" aria-hidden />
        </Link>
      ) : null}

      {selectedDay !== ALL && listed.length > 0 ? (
        <ol className="divide-y pb-24">
          {listed.map((activity, index) => (
            <li key={activity.id}>
              <Link
                href={`${base}/a/${activity.id}`}
                className="active:bg-muted flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{
                    backgroundColor:
                      activity.lat === null
                        ? 'var(--muted-foreground)'
                        : categoryMeta(activity.category).color,
                  }}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {activity.title}
                  </span>
                  {activity.lat === null ? (
                    <span className="text-muted-foreground block text-xs">
                      沒有座標，不在地圖上
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-muted-foreground px-4 py-6 text-center text-xs">
          {selectedDay === ALL ? null : '這一天還沒有行程'}
        </div>
      )}
    </div>
  )
}

