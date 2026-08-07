'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, MapIcon, Plus } from 'lucide-react'

import { ActivityCard } from '@/components/activity/activity-card'
import { ActivityFormSheet } from '@/components/activity/activity-form-sheet'
import { AddActivitySheet } from '@/components/activity/add-activity-sheet'
import { DaySortSheet } from '@/components/activity/day-sort-sheet'
import { applyFilters, FilterBar } from '@/components/activity/filter-bar'
import { MoveToSheet } from '@/components/activity/move-to-sheet'
import { AddImageSheet } from '@/components/image/add-image-sheet'
import { ActivityMap, toMappedActivities } from '@/components/map/activity-map'
import { DayTabs } from '@/components/trip/day-tabs'
import { useBasePath, useTripAccess } from '@/components/trip/trip-access'
import { Button } from '@/components/ui/button'
import { dayColor } from '@/lib/constants'
import { formatFullDate } from '@/lib/format'
import type { ActivityWithRelations } from '@/lib/queries'
import type { ActivityFilters } from '@/lib/activity-filters'
import { useActivityFilters } from '@/lib/use-activity-filters'
import type {
  ActivityCategory,
  TagRow,
  TripDayRow,
} from '@/lib/supabase/database.types'

type Props = {
  days: TripDayRow[]
  /** 每一天的行程，全部都帶進來 —— 切換日期因此不需要再往返伺服器 */
  activitiesByDay: Record<string, ActivityWithRelations[]>
  backlogActivities: ActivityWithRelations[]
  tags: TagRow[]
  counts: Record<string, number>
  placeSearchEnabled: boolean
  initialFilters: ActivityFilters
  /** 由網址決定的初始日期；之後的切換由 client 端接手 */
  initialDayIndex: number
}

export function DayView({
  days,
  activitiesByDay,
  backlogActivities,
  tags,
  counts,
  placeSearchEnabled,
  initialFilters,
  initialDayIndex,
}: Props) {
  const router = useRouter()
  const base = useBasePath()
  const { canEdit } = useTripAccess()

  /*
    切換日期不做導航。

    每一天的資料在同一份 bundle 裡就全拿到了，走 <Link> 換頁只會讓伺服器
    把同樣的 6 個查詢重跑一次，換來一段空白。改成 client 端切換 +
    history.pushState 同步網址：切換是瞬間的，但網址仍然可以分享、
    上一頁也照常運作。
  */
  const [dayIndex, setDayIndex] = useState(initialDayIndex)

  // 真正的導航（深連結、底部導覽）才會換 initialDayIndex，此時跟著網址走。
  // 在 render 期間調整自己的狀態是 React 官方認可的作法，不會有串連渲染。
  const [lastInitial, setLastInitial] = useState(initialDayIndex)
  if (initialDayIndex !== lastInitial) {
    setLastInitial(initialDayIndex)
    setDayIndex(initialDayIndex)
  }

  useEffect(() => {
    function onPop() {
      const m = window.location.pathname.match(/\/d\/(\d+)/)
      if (m) setDayIndex(Number(m[1]))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function selectDay(next: number) {
    if (next === dayIndex) return
    setDayIndex(next)
    // 只換網址，不觸發 Next 的導航與資料重取
    window.history.pushState(
      null,
      '',
      `${base}/d/${next}${window.location.search}`,
    )
  }

  /*
    新增後樂觀顯示。

    建立成功之後仍要 router.refresh() 才拿得到伺服器版本的資料，中間有一段
    空窗，看起來像「送出了但沒反應」。這裡先用手邊已有的輸入內容把卡片畫出來，
    等真正的資料回來（id 出現在 props 裡）再把暫時的那筆移除。

    暫時的那筆用的是伺服器回傳的 id，所以真實資料回來時 React 認得是同一個
    元素，只會更新內容、不會重新掛載 —— 卡片因此不會再跑一次進場動畫。
  */
  const [optimistic, setOptimistic] = useState<ActivityWithRelations[]>([])
  const serverIds = new Set(
    Object.values(activitiesByDay)
      .flat()
      .map((a) => a.id),
  )
  const pendingOptimistic = optimistic.filter((a) => !serverIds.has(a.id))
  if (pendingOptimistic.length !== optimistic.length) {
    setOptimistic(pendingOptimistic)
  }

  // 一起算，參考才會穩定，下游的 useMemo 也才不會每次 render 都失效
  const { currentDay, dayActivities } = useMemo(() => {
    const day = days.find((d) => d.day_index === dayIndex) ?? days[0]
    const fromServer = activitiesByDay[day?.id] ?? []
    const mine = pendingOptimistic.filter((a) => a.day_id === day?.id)
    return {
      currentDay: day,
      dayActivities: mine.length ? [...fromServer, ...mine] : fromServer,
    }
  }, [days, dayIndex, activitiesByDay, pendingOptimistic])

  const [sortOpen, setSortOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ActivityWithRelations | null>(null)
  const [moving, setMoving] = useState<ActivityWithRelations | null>(null)
  const [imageTarget, setImageTarget] = useState<string | null>(null)

  const { filters, toggleCategory, toggleTag, clear, active } =
    useActivityFilters(initialFilters)
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
        currentDayIndex={dayIndex}
        counts={counts}
        onSelect={selectDay}
      />

      <FilterBar
        tags={tags}
        availableCategories={availableCategories}
        filters={filters}
        onToggleCategory={toggleCategory}
        onToggleTag={toggleTag}
        onClear={clear}
        active={active}
      />

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

      <main className="space-y-3 px-4 pb-24">
        {visible.length === 0 ? (
          <EmptyDay filtered={active} canEdit={canEdit} onAdd={startAdding} />
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

        {active && visible.length < dayActivities.length ? (
          <p className="text-muted-foreground pt-2 text-center text-xs">
            篩選中，隱藏了 {dayActivities.length - visible.length} 個行程
          </p>
        ) : null}

        {/*
          地圖放在行程列表之後。規劃時的主體是「當天要去哪些地方、順序如何」，
          地圖是輔助確認動線用的，佔住第一屏反而把行程擠下去。
        */}
        {mapPoints.length > 0 ? (
          <section className="overflow-hidden rounded-xl border">
            <div className="flex h-11 items-center gap-2 px-4 text-sm">
              <MapIcon className="text-muted-foreground size-4" aria-hidden />
              <span className="font-medium">
                地圖動線
                <span className="text-muted-foreground ml-1 font-normal">
                  （{mapPoints.length} 個地點）
                </span>
              </span>
            </div>
            <ActivityMap points={mapPoints} className="h-72 border-t" />
          </section>
        ) : null}
      </main>

      {canEdit ? (
        <div className="bottom-above-nav pointer-events-none fixed inset-x-0 z-20 mx-auto flex max-w-md justify-end px-4 pb-3">
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
        onCreated={(activity) => setOptimistic((prev) => [...prev, activity])}
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
        hasCover={Boolean(
          imageTarget &&
          (dayActivities
            .concat(backlogActivities)
            .find((a) => a.id === imageTarget)
            ?.images.some((i) => i.role === 'cover') ??
            false),
        )}
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
