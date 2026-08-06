'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronUp, MapIcon, Plus } from 'lucide-react'

import { ActivityCard } from '@/components/activity/activity-card'
import { ActivityFormSheet } from '@/components/activity/activity-form-sheet'
import { AddActivitySheet } from '@/components/activity/add-activity-sheet'
import { DaySortSheet } from '@/components/activity/day-sort-sheet'
import {
  applyFilters,
  FilterBar,
  parseFilters,
} from '@/components/activity/filter-bar'
import { MoveToSheet } from '@/components/activity/move-to-sheet'
import { AddImageSheet } from '@/components/image/add-image-sheet'
import { ActivityMap, toMappedActivities } from '@/components/map/activity-map'
import { DayTabs } from '@/components/trip/day-tabs'
import { useTripAccess } from '@/components/trip/trip-access'
import { Button } from '@/components/ui/button'
import { dayColor } from '@/lib/constants'
import { formatFullDate } from '@/lib/format'
import type { ActivityWithRelations } from '@/lib/queries'
import type {
  ActivityCategory,
  TagRow,
  TripDayRow,
} from '@/lib/supabase/database.types'

type Props = {
  days: TripDayRow[]
  currentDay: TripDayRow
  /** 當天的行程，已依 position 排序 */
  dayActivities: ActivityWithRelations[]
  backlogActivities: ActivityWithRelations[]
  tags: TagRow[]
  counts: Record<string, number>
  placeSearchEnabled: boolean
}

export function DayView({
  days,
  currentDay,
  dayActivities,
  backlogActivities,
  tags,
  counts,
  placeSearchEnabled,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canEdit } = useTripAccess()

  const [mapOpen, setMapOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ActivityWithRelations | null>(null)
  const [moving, setMoving] = useState<ActivityWithRelations | null>(null)
  const [imageTarget, setImageTarget] = useState<string | null>(null)

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  )
  const visible = useMemo(
    () => applyFilters(dayActivities, filters),
    [dayActivities, filters],
  )

  const availableCategories = useMemo(
    () => new Set(dayActivities.map((a) => a.category as ActivityCategory)),
    [dayActivities],
  )

  const mapPoints = useMemo(
    () => toMappedActivities(dayActivities, dayColor(currentDay.day_index)),
    [dayActivities, currentDay.day_index],
  )

  const isFiltered = filters.categories.length > 0 || filters.tagIds.length > 0

  /**
   * 儲備區是空的時候，選單只剩「建立新行程」一個有意義的選項，
   * 直接開表單，少一次無意義的點擊。
   */
  function startAdding() {
    if (backlogActivities.length > 0) setAddOpen(true)
    else setCreateOpen(true)
  }

  return (
    <>
      <DayTabs
        days={days}
        currentDayIndex={currentDay.day_index}
        counts={counts}
      />

      <FilterBar tags={tags} availableCategories={availableCategories} />

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">
            {currentDay.title ?? `Day ${currentDay.day_index}`}
          </h2>
          {currentDay.date ? (
            <p className="text-muted-foreground text-xs">
              {formatFullDate(currentDay.date)}
            </p>
          ) : null}
        </div>

        {canEdit && dayActivities.length > 1 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOpen(true)}
            className="shrink-0 gap-1.5"
          >
            <ArrowUpDown className="size-4" aria-hidden />
            排序
          </Button>
        ) : null}
      </div>

      <main className="space-y-3 px-4 pb-40">
        {visible.length === 0 ? (
          <EmptyDay
            filtered={isFiltered}
            canEdit={canEdit}
            onAdd={startAdding}
          />
        ) : (
          visible.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              tags={tags}
              // 序號用未篩選前的位置，才會跟地圖標記對得上
              order={dayActivities.indexOf(activity) + 1}
              onEdit={() => setEditing(activity)}
              onMove={() => setMoving(activity)}
              onAddImage={() => setImageTarget(activity.id)}
            />
          ))
        )}

        {isFiltered && visible.length < dayActivities.length ? (
          <p className="text-muted-foreground pt-2 text-center text-xs">
            篩選中，隱藏了 {dayActivities.length - visible.length} 個行程
          </p>
        ) : null}

        {/*
          地圖放在行程列表之後。規劃時的主體是「當天要去哪些地方、順序如何」，
          地圖是輔助確認動線用的，佔住第一屏反而把行程擠下去。
          預設收合成一條，需要時才展開。
        */}
        {mapPoints.length > 0 ? (
          <section className="overflow-hidden rounded-xl border">
            <button
              type="button"
              onClick={() => setMapOpen((v) => !v)}
              aria-expanded={mapOpen}
              className="hover:bg-muted/50 flex h-11 w-full items-center gap-2 px-4 text-sm"
            >
              <MapIcon className="text-muted-foreground size-4" aria-hidden />
              <span className="flex-1 text-left font-medium">
                地圖動線
                <span className="text-muted-foreground ml-1 font-normal">
                  （{mapPoints.length} 個地點）
                </span>
              </span>
              {mapOpen ? (
                <ChevronUp className="text-muted-foreground size-4" aria-hidden />
              ) : (
                <ChevronDown
                  className="text-muted-foreground size-4"
                  aria-hidden
                />
              )}
            </button>

            {mapOpen ? (
              <ActivityMap points={mapPoints} className="h-[45dvh] border-t" />
            ) : null}
          </section>
        ) : null}
      </main>

      {canEdit ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-14 z-20 mx-auto flex max-w-md justify-end px-4 pb-3">
          <Button
            size="lg"
            onClick={startAdding}
            className="pointer-events-auto h-13 gap-2 rounded-full pr-6 pl-5 shadow-lg"
          >
            <Plus className="size-5" aria-hidden />
            新增行程
          </Button>
        </div>
      ) : null}

      <AddActivitySheet
        open={addOpen}
        onOpenChange={setAddOpen}
        dayId={currentDay.id}
        dayLabel={`Day ${currentDay.day_index}`}
        backlogActivities={backlogActivities}
        placeSearchEnabled={placeSearchEnabled}
        onCreateNew={() => setCreateOpen(true)}
      />

      {/* 建立新行程 */}
      <ActivityFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        dayId={currentDay.id}
        tags={tags}
        placeSearchEnabled={placeSearchEnabled}
        onSaved={() => router.refresh()}
      />

      {/* 編輯既有行程 */}
      <ActivityFormSheet
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        dayId={currentDay.id}
        activity={editing}
        tags={tags}
        placeSearchEnabled={placeSearchEnabled}
        onSaved={() => router.refresh()}
      />

      <MoveToSheet
        open={Boolean(moving)}
        onOpenChange={(open) => !open && setMoving(null)}
        activityIds={moving ? [moving.id] : []}
        days={days}
        currentDayId={currentDay.id}
        counts={counts}
        backlogCount={backlogActivities.length}
      />

      <DaySortSheet
        open={sortOpen}
        onOpenChange={(open) => {
          setSortOpen(open)
          if (!open) router.refresh()
        }}
        dayId={currentDay.id}
        dayLabel={`Day ${currentDay.day_index}`}
        dayActivities={dayActivities}
        backlogActivities={backlogActivities}
      />

      <AddImageSheet
        activityId={imageTarget}
        open={Boolean(imageTarget)}
        onOpenChange={(open) => !open && setImageTarget(null)}
      />
    </>
  )
}

function EmptyDay({
  filtered,
  canEdit,
  onAdd,
}: {
  filtered: boolean
  canEdit: boolean
  onAdd: () => void
}) {
  if (filtered) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        沒有符合篩選條件的行程
      </p>
    )
  }
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        <MapIcon className="text-muted-foreground size-6" aria-hidden />
      </div>
      <p className="mt-4 font-medium">這一天還沒有行程</p>
      <p className="text-muted-foreground mt-1 max-w-[15rem] text-sm">
        直接新增，或從儲備區把想去的地方挑進來。
      </p>
      {canEdit ? (
        <Button onClick={onAdd} className="mt-5 gap-2">
          <Plus className="size-4" aria-hidden />
          新增行程
        </Button>
      ) : null}
    </div>
  )
}
