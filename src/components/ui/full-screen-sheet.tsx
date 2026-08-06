'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 全螢幕面板。
 *
 * 為什麼不用 vaul 的 Drawer：
 *
 * 1. Drawer 在拖曳關閉時會對內容套用 CSS transform。transform 會建立新的
 *    containing block，裡面的 position: fixed 會以它為基準，dnd-kit 算出的
 *    座標也跟著偏掉 —— 拖曳中的項目就跟手指對不上。
 * 2. Drawer 的「往下拖關閉」與內容裡的拖曳排序、拖曳調整圖片順序會搶同一個
 *    手勢，兩邊互相干擾。
 *
 * 這裡改用單純的 fixed 定位，不做任何 transform、也不接手勢，
 * 關閉只靠右上角的按鈕與 Esc。內容需要拖曳互動的面板都該用這個。
 */
export function FullScreenSheet({
  open,
  onOpenChange,
  title,
  headerAction,
  children,
  footer,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  /** 標題列右側，通常放「完成」之類的主要動作 */
  headerAction?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)

    // 面板開著時鎖住底層頁面的捲動
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      className={cn(
        'bg-background fixed inset-0 z-50 mx-auto flex max-w-md flex-col',
        className,
      )}
    >
      <header className="pt-safe flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label="關閉"
          className="shrink-0"
        >
          <X className="size-5" aria-hidden />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
          {title}
        </h2>
        {headerAction}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {footer ? (
        <div className="pb-safe shrink-0 border-t px-4 py-3">{footer}</div>
      ) : null}
    </div>
  )
}
