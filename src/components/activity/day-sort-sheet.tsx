'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Inbox,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/full-screen-sheet'
import { categoryMeta } from '@/lib/constants'
import type { ActivityWithRelations } from '@/lib/queries'
import { useTripMutations } from '@/lib/use-trip-mutations'
import { cn } from '@/lib/utils'

const DAY = 'day'
const BACKLOG = 'backlog'
type ContainerId = typeof DAY | typeof BACKLOG

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayId: string
  dayLabel: string
  dayActivities: ActivityWithRelations[]
  backlogActivities: ActivityWithRelations[]
}

/**
 * 排序模式。
 *
 * 手機上拖曳長卡片很難操作，所以這裡把每個行程縮成 48px 高、只有標題的單行，
 * 一個畫面能看到十幾個項目，單手就能排完。
 *
 * 只有左側的把手是可拖曳區（drag-handle 設了 touch-action: none），
 * 其餘區域仍可正常捲動列表。
 */
export function DaySortSheet({
  open,
  onOpenChange,
  dayId,
  dayLabel,
  dayActivities,
  backlogActivities,
}: Props) {
  const mutations = useTripMutations()
  const [pending, startTransition] = useTransition()
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const byId = useMemo(() => {
    const map = new Map<string, ActivityWithRelations>()
    for (const a of [...dayActivities, ...backlogActivities]) map.set(a.id, a)
    return map
  }, [dayActivities, backlogActivities])

  // 拖曳期間的本地順序；按「完成」才寫回資料庫
  const [items, setItems] = useState<Record<ContainerId, string[]>>(() => ({
    [DAY]: dayActivities.map((a) => a.id),
    [BACKLOG]: backlogActivities.map((a) => a.id),
  }))

  // 每次開啟時以最新資料重置
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setItems({
        [DAY]: dayActivities.map((a) => a.id),
        [BACKLOG]: backlogActivities.map((a) => a.id),
      })
      setBacklogOpen(false)
    }
  }

  const sensors = useSensors(
    // 需要移動 5px 才開始拖曳，否則點擊會被誤判成拖曳
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function findContainer(id: string): ContainerId | null {
    if (id === DAY || id === BACKLOG) return id
    if (items[DAY].includes(id)) return DAY
    if (items[BACKLOG].includes(id)) return BACKLOG
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  /** 跨容器搬移在 dragOver 就先反映，讓使用者看得到即時回饋 */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(String(active.id))
    const overContainer = findContainer(String(over.id))
    if (!activeContainer || !overContainer) return
    if (activeContainer === overContainer) return

    setItems((prev) => {
      const source = prev[activeContainer].filter((id) => id !== active.id)
      const target = [...prev[overContainer]]
      const overIndex = target.indexOf(String(over.id))
      const insertAt = overIndex >= 0 ? overIndex : target.length
      target.splice(insertAt, 0, String(active.id))
      return { ...prev, [activeContainer]: source, [overContainer]: target }
    })

    // 拖進儲備區時自動展開，否則看不到自己拖到哪
    if (overContainer === BACKLOG) setBacklogOpen(true)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const container = findContainer(String(active.id))
    if (!container) return

    const oldIndex = items[container].indexOf(String(active.id))
    const newIndex = items[container].indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

    setItems((prev) => ({
      ...prev,
      [container]: arrayMove(prev[container], oldIndex, newIndex),
    }))
  }

  function save() {
    startTransition(async () => {
      // 兩個容器各送一次，讓 position 與 day_id 一次到位
      const results = await Promise.all([
        mutations.reorderActivities(dayId, items[DAY]),
        mutations.reorderActivities(null, items[BACKLOG]),
      ])
      const failed = results.find((r) => !r.ok)
      if (failed && !failed.ok) {
        toast.error('儲存排序失敗', { description: failed.error })
        return
      }
      toast.success('排序已儲存')
      onOpenChange(false)
    })
  }

  const activeActivity = activeId ? byId.get(activeId) : null

  return (
    <FullScreenSheet
      open={open}
      onOpenChange={onOpenChange}
      busy={pending}
      title={`排序 · ${dayLabel}`}
      headerAction={
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          完成
        </Button>
      }
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <SortableList
            containerId={DAY}
            ids={items[DAY]}
            byId={byId}
            emptyHint="這一天還沒有行程。從下方儲備區拖上來，或關閉排序後新增。"
          />
        </div>

        <div className="bg-background border-t">
          <button
            type="button"
            onClick={() => setBacklogOpen((v) => !v)}
            className="hover:bg-muted/50 flex h-12 w-full items-center gap-2 px-4 text-sm font-medium"
          >
            <Inbox className="size-4" aria-hidden />
            儲備區
            <span className="text-muted-foreground">
              （{items[BACKLOG].length}）
            </span>
            <span className="text-muted-foreground ml-auto">
              {backlogOpen ? (
                <ChevronDown className="size-4" aria-hidden />
              ) : (
                <ChevronUp className="size-4" aria-hidden />
              )}
            </span>
          </button>

          <div
            className={cn(
              'overflow-y-auto overscroll-contain transition-[height]',
              backlogOpen ? 'h-[35dvh]' : 'h-16',
            )}
          >
            <SortableList
              containerId={BACKLOG}
              ids={items[BACKLOG]}
              byId={byId}
              emptyHint="把行程拖到這裡可以先暫存起來。"
            />
          </div>
        </div>

        <DragOverlay>
          {activeActivity ? (
            <SortRow activity={activeActivity} index={0} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </FullScreenSheet>
  )
}

function SortableList({
  containerId,
  ids,
  byId,
  emptyHint,
}: {
  containerId: ContainerId
  ids: string[]
  byId: Map<string, ActivityWithRelations>
  emptyHint: string
}) {
  // 空容器也要能接收拖曳，所以整個區域註冊成 droppable
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <ul
        ref={setNodeRef}
        className={cn(
          'min-h-16 py-1 transition-colors',
          isOver && 'bg-primary/5',
        )}
      >
        {ids.length === 0 ? (
          <li className="text-muted-foreground px-4 py-5 text-center text-xs">
            {emptyHint}
          </li>
        ) : (
          ids.map((id, index) => {
            const activity = byId.get(id)
            if (!activity) return null
            return (
              <SortableRow key={id} activity={activity} index={index + 1} />
            )
          })
        )}
      </ul>
    </SortableContext>
  )
}

function SortableRow({
  activity,
  index,
}: {
  activity: ActivityWithRelations
  index: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-40')}
    >
      <SortRow
        activity={activity}
        index={index}
        handleProps={{ ...attributes, ...listeners }}
      />
    </li>
  )
}

function SortRow({
  activity,
  index,
  handleProps,
  dragging,
}: {
  activity: ActivityWithRelations
  index: number
  handleProps?: Record<string, unknown>
  dragging?: boolean
}) {
  const meta = categoryMeta(activity.category)
  const Icon = meta.icon

  return (
    <div
      className={cn(
        'flex h-12 items-center gap-2 px-2',
        dragging && 'bg-card rounded-lg border shadow-lg',
      )}
    >
      <button
        type="button"
        {...handleProps}
        aria-label={`拖曳 ${activity.title}`}
        className="drag-handle text-muted-foreground hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-md"
      >
        <GripVertical className="size-5" aria-hidden />
      </button>

      <span className="text-muted-foreground w-5 shrink-0 text-center text-xs tabular-nums">
        {index}
      </span>

      <Icon
        className="size-4 shrink-0"
        style={{ color: meta.color }}
        aria-hidden
      />

      <span className="min-w-0 flex-1 truncate text-sm">{activity.title}</span>
    </div>
  )
}
