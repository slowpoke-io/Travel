'use client'

import Link, { useLinkStatus } from 'next/link'
import { useEffect, useRef } from 'react'

import { useBasePath } from '@/components/trip/trip-access'
import { formatDayLabel } from '@/lib/format'
import type { TripDayRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

/**
 * 橫向捲動的日期分頁條。
 * 切換日時自動把目前這天捲進畫面中央 —— 天數多時很重要。
 */
export function DayTabs({
  days,
  currentDayIndex,
  counts,
  onSelect,
}: {
  days: TripDayRow[]
  currentDayIndex: number
  /** dayId → 該天的行程數 */
  counts: Record<string, number>
  /**
   * 有提供的話改用 button 就地切換，不做導航 ——
   * 所有天的資料本來就都在手上，換頁只是把同樣的查詢再跑一次。
   */
  onSelect?: (dayIndex: number) => void
}) {
  const base = useBasePath()
  const activeRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [currentDayIndex])

  return (
    <div className="no-scrollbar overflow-x-auto border-b">
      <div className="flex w-max gap-2 px-4 py-2.5">
        {days.map((day) => {
          const active = day.day_index === currentDayIndex
          const count = counts[day.id] ?? 0
          const className = cn(
            'relative flex min-w-[4.5rem] flex-col items-center overflow-hidden rounded-lg px-3 py-2 text-center transition-colors',
            active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground active:bg-muted/70',
          )
          const label = (
            <>
              <span className="text-sm font-semibold">Day {day.day_index}</span>
              <span className="text-[11px] opacity-80">
                {day.date ? formatDayLabel(day.date) : `${count} 個行程`}
              </span>
            </>
          )

          return onSelect ? (
            <button
              key={day.id}
              type="button"
              ref={active ? activeRef : undefined}
              onClick={() => onSelect(day.day_index)}
              aria-current={active ? 'page' : undefined}
              className={className}
            >
              {label}
            </button>
          ) : (
            <Link
              key={day.id}
              ref={active ? activeRef : undefined}
              href={`${base}/d/${day.day_index}`}
              aria-current={active ? 'page' : undefined}
              className={className}
            >
              {label}
              <TabPendingBar />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 點下去到新頁面畫出來之間會有空窗（每一頁都是動態渲染），
 * 沒有回饋的話會覺得「按了沒反應」。這條進度條讓點擊立刻有反應。
 *
 * 必須是 <Link> 的子孫元素，useLinkStatus 才讀得到狀態。
 */
function TabPendingBar() {
  const { pending } = useLinkStatus()
  if (!pending) return null

  return (
    <span
      aria-hidden
      className="bg-foreground/30 absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
    >
      <span className="bg-foreground/70 animate-tab-loading block h-full w-1/2" />
    </span>
  )
}
