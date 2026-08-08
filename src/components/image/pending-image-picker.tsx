'use client'

import { useRef, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ImagePlus, TriangleAlert, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { PendingUpload } from '@/lib/use-pending-uploads'
import { cn } from '@/lib/utils'

const MAX_IMAGES = 10

/**
 * 待上傳圖片的選擇器，可拖曳排序。
 *
 * 選好就立刻開始上傳，進度以圓環壓在預覽圖上。使用者可以在上傳的同時
 * 繼續填其他欄位 —— 送出按鈕會等到全部傳完才亮。
 *
 * 排第一張的成為封面，所以拖曳排序同時也是「選封面」的操作。
 */
export function PendingImagePicker({
  items,
  onAdd,
  onRemove,
  onReorder,
  hasExistingCover,
  showCoverBadge = true,
}: {
  items: PendingUpload[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onReorder: (next: PendingUpload[]) => void
  hasExistingCover: boolean
  /** 沒有封面概念的情境（例如花費的圖片），關掉第一張的「封面」標記 */
  showCoverBadge?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    // 要移動 5px 才算拖曳，否則點「移除」會被誤判
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = '' // 允許重選同一張
          if (files.length) onAdd(files)
        }}
        className="hidden"
      />

      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-4 gap-2">
              {items.map((item, index) => (
                <SortableThumb
                  key={item.id}
                  item={item}
                  isCover={showCoverBadge && index === 0 && !hasExistingCover}
                  dragging={activeId === item.id}
                  onRemove={() => onRemove(item.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      {items.length < MAX_IMAGES ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="w-full gap-2"
        >
          <ImagePlus className="size-4" aria-hidden />
          {items.length ? '再加圖片' : '加入圖片'}
        </Button>
      ) : null}
    </div>
  )
}

function SortableThumb({
  item,
  isCover,
  dragging,
  onRemove,
}: {
  item: PendingUpload
  isCover: boolean
  dragging: boolean
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', dragging && 'z-10 opacity-60')}
    >
      <div
        {...attributes}
        {...listeners}
        className="drag-handle bg-muted relative aspect-square overflow-hidden rounded-lg"
      >
        {/*
          預覽用原生 <img>：來源是本機 blob URL，next/image 幫不上忙
          （一定要 unoptimized），卻會在一次選多張時造成明顯閃爍。
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt=""
          className={cn(
            'pointer-events-none absolute inset-0 size-full object-cover transition-opacity',
            item.status !== 'done' && 'opacity-50',
          )}
        />

        {item.status === 'uploading' ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <ProgressRing value={item.progress} />
          </span>
        ) : null}

        {item.status === 'error' ? (
          <span
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/60 text-white"
            title={item.error}
          >
            <TriangleAlert className="size-5" aria-hidden />
            <span className="text-[10px]">上傳失敗</span>
          </span>
        ) : null}

        {isCover && item.status === 'done' ? (
          <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[9px] text-white">
            封面
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="移除這張圖片"
        className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </li>
  )
}

/** 壓在預覽圖上的環形進度 */
function ProgressRing({ value }: { value: number }) {
  const r = 14
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100)

  return (
    <svg
      viewBox="0 0 36 36"
      className="size-9 -rotate-90"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.3)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 240ms ease' }}
      />
    </svg>
  )
}
