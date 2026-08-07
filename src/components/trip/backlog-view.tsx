'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CheckSquare, Inbox, Plus, X } from 'lucide-react'

import { ActivityCard } from '@/components/activity/activity-card'
import { ActivityFormSheet } from '@/components/activity/activity-form-sheet'
import { applyFilters, FilterBar } from '@/components/activity/filter-bar'
import { MoveToSheet } from '@/components/activity/move-to-sheet'
import { AddImageSheet } from '@/components/image/add-image-sheet'
import { useTripAccess } from '@/components/trip/trip-access'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { ActivityWithRelations } from '@/lib/queries'
import type { ActivityFilters } from '@/lib/activity-filters'
import { useActivityFilters } from '@/lib/use-activity-filters'
import type {
  ActivityCategory,
  TagRow,
  TripDayRow,
} from '@/lib/supabase/database.types'

export function BacklogView({
  days,
  backlogActivities,
  tags,
  counts,
  placeSearchEnabled,
  initialFilters,
}: {
  days: TripDayRow[]
  backlogActivities: ActivityWithRelations[]
  tags: TagRow[]
  counts: Record<string, number>
  placeSearchEnabled: boolean
  initialFilters: ActivityFilters
}) {
  const router = useRouter()
  const { canEdit } = useTripAccess()

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<ActivityWithRelations | null>(null)
  const [moving, setMoving] = useState<string[] | null>(null)
  const [imageTarget, setImageTarget] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const { filters, toggleCategory, toggleTag, clear, active } =
    useActivityFilters(initialFilters)
  const visible = useMemo(
    () => applyFilters(backlogActivities, filters),
    [backlogActivities, filters],
  )
  const availableCategories = useMemo(
    () => new Set(backlogActivities.map((a) => a.category as ActivityCategory)),
    [backlogActivities],
  )

  return (
    <>
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
        <div>
          <h2 className="font-semibold">行程儲備區</h2>
          <p className="text-muted-foreground text-xs">
            {backlogActivities.length} 個想去的地方
          </p>
        </div>

        {canEdit && backlogActivities.length > 0 ? (
          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectMode((v) => !v)
              setSelected([])
            }}
            className="gap-1.5"
          >
            {selectMode ? (
              <>
                <X className="size-4" aria-hidden />
                取消
              </>
            ) : (
              <>
                <CheckSquare className="size-4" aria-hidden />
                多選
              </>
            )}
          </Button>
        ) : null}
      </div>

      <main className="space-y-3 px-4 pb-24">
        {visible.length === 0 ? (
          <EmptyBacklog
            filtered={visible.length !== backlogActivities.length}
            canEdit={canEdit}
            onAdd={() => setAddOpen(true)}
          />
        ) : (
          visible.map((activity) => (
            <div key={activity.id} className="flex items-start gap-2">
              {selectMode ? (
                <Checkbox
                  checked={selected.includes(activity.id)}
                  onCheckedChange={(v) =>
                    setSelected((prev) =>
                      v
                        ? [...prev, activity.id]
                        : prev.filter((id) => id !== activity.id),
                    )
                  }
                  className="mt-5"
                  aria-label={`選取 ${activity.title}`}
                />
              ) : null}

              <div className="min-w-0 flex-1">
                <ActivityCard
                  activity={activity}
                  tags={tags}
                  onEdit={() => setEditing(activity)}
                  onMove={() => setMoving([activity.id])}
                  onAddImage={() => setImageTarget(activity.id)}
                />
              </div>
            </div>
          ))
        )}
      </main>

      {/* 多選模式的批次操作列 */}
      {selectMode && selected.length > 0 ? (
        <div className="bg-background bottom-above-nav fixed inset-x-0 z-30 mx-auto max-w-md border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm font-medium">
              已選 {selected.length} 個
            </p>
            <Button size="sm" onClick={() => setMoving(selected)}>
              移動到…
            </Button>
          </div>
        </div>
      ) : null}

      {canEdit && !selectMode ? (
        <div className="bottom-above-nav pointer-events-none fixed inset-x-0 z-20 mx-auto flex max-w-md justify-end px-4 pb-3">
          <Button
            size="lg"
            onClick={() => setAddOpen(true)}
            className="pointer-events-auto h-13 gap-2 rounded-full pr-6 pl-5 shadow-lg"
          >
            <Plus className="size-5" aria-hidden />
            加入想去的地方
          </Button>
        </div>
      ) : null}

      <ActivityFormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        dayId={null}
        tags={tags}
        placeSearchEnabled={placeSearchEnabled}
        onSaved={() => router.refresh()}
      />

      <ActivityFormSheet
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        dayId={null}
        activity={editing}
        tags={tags}
        placeSearchEnabled={placeSearchEnabled}
        onSaved={() => router.refresh()}
      />

      <MoveToSheet
        open={Boolean(moving)}
        onOpenChange={(open) => !open && setMoving(null)}
        activityIds={moving ?? []}
        days={days}
        currentDayId={null}
        counts={counts}
        backlogCount={backlogActivities.length}
        onMoved={() => {
          setSelected([])
          setSelectMode(false)
          router.refresh()
        }}
      />

      <AddImageSheet
        activityId={imageTarget}
        open={Boolean(imageTarget)}
        onOpenChange={(open) => !open && setImageTarget(null)}
        hasCover={Boolean(
          imageTarget &&
          backlogActivities
            .find((a) => a.id === imageTarget)
            ?.images.some((i) => i.role === 'cover'),
        )}
      />
    </>
  )
}

function EmptyBacklog({
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
        <Inbox className="text-muted-foreground size-6" aria-hidden />
      </div>
      <p className="mt-4 font-medium">儲備區是空的</p>
      <p className="text-muted-foreground mt-1 max-w-[16rem] text-sm leading-relaxed">
        看到想去的地方就先丟進來，之後再決定要排到哪一天。
      </p>
      {canEdit ? (
        <Button onClick={onAdd} className="mt-5 gap-2">
          <Plus className="size-4" aria-hidden />
          加入想去的地方
        </Button>
      ) : null}
    </div>
  )
}
