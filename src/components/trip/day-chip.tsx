'use client'

import { cn } from '@/lib/utils'

/**
 * 「全部 / D1 / D2 …」的橫向切換 chip。
 *
 * 地圖與花費兩個分頁共用。兩邊都是「一次看全部太多、想聚焦某一天」的情境，
 * 用同一個外觀使用者才不用重新學。
 */
export function DayChip({
  active,
  onClick,
  label,
  sub,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  sub?: string
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex min-w-14 flex-col items-center rounded-lg px-2.5 py-1.5 text-center transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'bg-muted',
      )}
    >
      <span className="flex items-center gap-1 text-xs font-semibold">
        {color ? (
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : null}
        {label}
      </span>
      {sub ? <span className="text-[10px] opacity-75">{sub}</span> : null}
    </button>
  )
}
