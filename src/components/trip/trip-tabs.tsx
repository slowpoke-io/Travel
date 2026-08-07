'use client'

import { usePathname } from 'next/navigation'

import { BacklogView } from '@/components/trip/backlog-view'
import { DayView } from '@/components/trip/day-view'
import { TripMapView } from '@/components/trip/trip-map-view'
import type { ActivityFilters } from '@/lib/activity-filters'
import type { ActivityWithRelations } from '@/lib/queries'
import type { TagRow, TripDayRow } from '@/lib/supabase/database.types'
import { tripViewFromPathname } from '@/lib/trip-nav'

/**
 * 行程 / 儲備區 / 地圖三個分頁。
 *
 * 三者都是同一份 bundle 的不同呈現，所以由同一個路由一次拿到全部資料，
 * 之後切換分頁只是換這裡渲染哪個 view —— 沒有導航、沒有查詢、沒有等待。
 *
 * 「現在是哪個分頁」直接讀網址，不另外存 state：底部導覽用 pushState 換
 * 網址，Next 會同步到 usePathname，上一頁／下一頁也因此自動正確。
 */
export function TripTabs({
  days,
  activitiesByDay,
  backlogActivities,
  tags,
  counts,
  placeSearchEnabled,
  initialFilters,
}: {
  days: TripDayRow[]
  activitiesByDay: Record<string, ActivityWithRelations[]>
  backlogActivities: ActivityWithRelations[]
  tags: TagRow[]
  counts: Record<string, number>
  placeSearchEnabled: boolean
  initialFilters: ActivityFilters
}) {
  const view = tripViewFromPathname(usePathname())

  if (view.tab === 'backlog') {
    return (
      <BacklogView
        days={days}
        backlogActivities={backlogActivities}
        tags={tags}
        counts={counts}
        placeSearchEnabled={placeSearchEnabled}
        initialFilters={initialFilters}
      />
    )
  }

  if (view.tab === 'map') {
    return <TripMapView days={days} byDay={activitiesByDay} />
  }

  return (
    <DayView
      days={days}
      activitiesByDay={activitiesByDay}
      dayIndex={view.dayIndex}
      backlogActivities={backlogActivities}
      tags={tags}
      counts={counts}
      placeSearchEnabled={placeSearchEnabled}
      initialFilters={initialFilters}
    />
  )
}
