'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Star, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/lib/image-url'
import type { ImageRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

/**
 * 全螢幕圖片檢視器。
 *
 * 用原生的 scroll-snap 做左右滑動，而不是自己接 touch 事件 ——
 * 慣性、回彈、邊界都交給瀏覽器處理，在手機上的手感比手刻的順很多。
 */
export function Lightbox({
  images,
  startIndex,
  canEdit,
  pending,
  onClose,
  onMakeCover,
  onDelete,
}: {
  images: ImageRow[]
  startIndex: number
  canEdit: boolean
  pending: boolean
  onClose: () => void
  onMakeCover: (image: ImageRow) => void
  onDelete: (image: ImageRow) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(startIndex)

  const current = images[index] ?? images[0]

  // 開啟時直接捲到被點的那一張（不要有動畫，否則會看到快速滑過的過程）
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: track.clientWidth * startIndex, behavior: 'instant' })
  }, [startIndex])

  // 鍵盤操作（桌機）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 燈箱開著時鎖住底層頁面的捲動
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  function go(delta: number) {
    const track = trackRef.current
    if (!track) return
    const next = Math.min(Math.max(index + delta, 0), images.length - 1)
    track.scrollTo({ left: track.clientWidth * next, behavior: 'smooth' })
    setIndex(next)
  }

  /** 滑動停下來時同步目前是第幾張 */
  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    const next = Math.round(track.scrollLeft / track.clientWidth)
    if (next !== index && next >= 0 && next < images.length) setIndex(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="pt-safe flex items-center justify-between px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label="關閉"
        >
          <X className="size-5" aria-hidden />
        </Button>

        {images.length > 1 ? (
          <span className="text-sm text-white/70 tabular-nums">
            {index + 1} / {images.length}
          </span>
        ) : null}

        {canEdit && current ? (
          <div className="flex gap-1">
            {current.role !== 'cover' ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => onMakeCover(current)}
                className="gap-1.5 text-white hover:bg-white/10 hover:text-white"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Star className="size-4" aria-hidden />
                )}
                設為封面
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(current)}
              className="text-white hover:bg-white/10 hover:text-white"
              aria-label="刪除圖片"
            >
              <Trash2 className="size-5" aria-hidden />
            </Button>
          </div>
        ) : (
          <span className="size-9" />
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {images.map((image) => (
            <div
              key={image.id}
              className="relative h-full w-full shrink-0 snap-center"
            >
              <Image
                src={getImageUrl(image.path) ?? ''}
                alt={image.caption ?? ''}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {/* 桌機用的左右箭頭；手機直接滑就好 */}
        {images.length > 1 ? (
          <>
            <NavButton
              side="left"
              disabled={index === 0}
              onClick={() => go(-1)}
            />
            <NavButton
              side="right"
              disabled={index === images.length - 1}
              onClick={() => go(1)}
            />
          </>
        ) : null}
      </div>

      <div className="pb-safe px-4 py-3 text-center">
        {current?.caption ? (
          <p className="text-sm text-white/80">{current.caption}</p>
        ) : null}
        {images.length > 1 ? (
          <div className="mt-2 flex justify-center gap-1.5">
            {images.map((image, i) => (
              <span
                key={image.id}
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  i === index ? 'bg-white' : 'bg-white/35',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function NavButton({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? '上一張' : '下一張'}
      className={cn(
        'absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2 text-white transition-opacity sm:flex',
        side === 'left' ? 'left-2' : 'right-2',
        disabled && 'pointer-events-none opacity-0',
      )}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  )
}
