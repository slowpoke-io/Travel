'use client'

import Link from 'next/link'
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
}: {
  days: TripDayRow[]
  currentDayIndex: number
  /** dayId → 該天的行程數 */
  counts: Record<string, number>
}) {
  const base = useBasePath()
  const activeRef = useRef<HTMLAnchorElement>(null)

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
          return (
            <Link
              key={day.id}
              ref={active ? activeRef : undefined}
              href={`${base}/d/${day.day_index}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-[4.5rem] flex-col items-center rounded-lg px-3 py-2 text-center transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground active:bg-muted/70',
              )}
            >
              <span className="text-sm font-semibold">
                Day {day.day_index}
              </span>
              <span className="text-[11px] opacity-80">
                {day.date ? formatDayLabel(day.date) : `${count} 個行程`}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
