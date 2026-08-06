'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
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
import { ImagePlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { isSupportedImage } from '@/lib/image-compress'
import { cn } from '@/lib/utils'

export type PendingImage = {
  /** 穩定的識別碼，拖曳排序需要 */
  id: string
  file: File
  /** object URL，僅供表單內預覽 */
  previewUrl: string
}

const MAX_IMAGES = 10

/**
 * 表單內的「待上傳」圖片選擇器，可拖曳排序。
 *
 * 新增行程時該行程還不存在，images 的外鍵沒有對象可指，
 * 所以這裡只先留住 File 與預覽，等行程建立成功後才真正上傳。
 * 中途取消的話 Storage 不會留下任何孤兒檔案。
 *
 * 排在第一張的會成為封面，所以拖曳排序同時也是「選封面」的操作。
 */
export function PendingImagePicker({
  images,
  onChange,
  /** 這個行程目前是否已經有封面（有的話新圖就不會再標成封面） */
  hasExistingCover,
}: {
  images: PendingImage[]
  onChange: (next: PendingImage[]) => void
  hasExistingCover: boolean
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

  // 元件卸載時釋放 object URL，否則會累積佔記憶體
  const imagesRef = useRef(images)
  useEffect(() => {
    imagesRef.current = images
  }, [images])
  useEffect(() => {
    return () => {
      for (const img of imagesRef.current) URL.revokeObjectURL(img.previewUrl)
    }
  }, [])

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter(isSupportedImage)
    e.target.value = '' // 允許重選同一張
    if (!picked.length) return

    const room = MAX_IMAGES - images.length
    const next = picked.slice(0, room).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    onChange([...images, ...next])
  }

  function remove(id: string) {
    const target = images.find((i) => i.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onChange(images.filter((i) => i.id !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = images.findIndex((i) => i.id === active.id)
    const to = images.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return
    onChange(arrayMove(images, from, to))
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePick}
        className="hidden"
      />

      {images.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={images.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-4 gap-2">
              {images.map((img, index) => (
                <SortableThumb
                  key={img.id}
                  image={img}
                  isCover={index === 0 && !hasExistingCover}
                  dragging={activeId === img.id}
                  onRemove={() => remove(img.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      {images.length < MAX_IMAGES ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="w-full gap-2"
        >
          <ImagePlus className="size-4" aria-hidden />
          {images.length ? '再加圖片' : '加入圖片'}
        </Button>
      ) : null}

      <p className="text-muted-foreground text-xs">
        {images.length > 1
          ? '拖曳可調整順序，排第一張的會成為封面。'
          : images.length === 1
            ? hasExistingCover
              ? '這張會歸類為「資訊」，因為已經有封面了。'
              : '這張會成為封面。再加幾張可以拖曳調整順序。'
            : '可先加封面或票券截圖，之後在詳情頁還能分類成資訊／紀錄。'}
      </p>
    </div>
  )
}

function SortableThumb({
  image,
  isCover,
  dragging,
  onRemove,
}: {
  image: PendingImage
  isCover: boolean
  dragging: boolean
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.id })

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
        <Image
          src={image.previewUrl}
          alt=""
          fill
          sizes="25vw"
          unoptimized
          className="pointer-events-none object-cover"
        />
        {isCover ? (
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

/**
 * 決定每張待上傳圖片的用途。
 * 封面只能有一張（資料庫的 partial unique index 會擋），
 * 所以已經有封面時，新加的一律歸到「資訊」。
 */
export function resolvePendingRoles(
  count: number,
  hasExistingCover: boolean,
): ('cover' | 'info')[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 && !hasExistingCover ? 'cover' : 'info',
  )
}
