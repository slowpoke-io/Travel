import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'

import type { TripRow } from '@/lib/supabase/database.types'

/** '2026-10-01' → '10/01 (四)' */
export function formatDayLabel(date: string | null): string {
  if (!date) return ''
  return format(parseISO(date), 'MM/dd (EEEEE)', { locale: zhTW })
}

/** '2026-10-01' → '2026年10月1日 星期四' */
export function formatFullDate(date: string | null): string {
  if (!date) return ''
  return format(parseISO(date), 'yyyy年M月d日 EEEE', { locale: zhTW })
}

/** 旅遊卡片上的日期區間 */
export function formatDateRange(
  start: string | null,
  end: string | null,
): string {
  if (!start) return '未設定日期'
  const s = parseISO(start)
  if (!end) return format(s, 'yyyy/MM/dd')
  const e = parseISO(end)
  if (format(s, 'yyyy') === format(e, 'yyyy')) {
    return `${format(s, 'yyyy/MM/dd')} – ${format(e, 'MM/dd')}`
  }
  return `${format(s, 'yyyy/MM/dd')} – ${format(e, 'yyyy/MM/dd')}`
}

/** '09:30:00' → '09:30' */
export function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

/** 90 → '1 小時 30 分' */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} 分`
  if (m === 0) return `${h} 小時`
  return `${h} 小時 ${m} 分`
}

/** 精簡版，給卡片徽章用：90 → '1h30' */
export function formatDurationShort(minutes: number | null): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}h`
  return `${h}h${m}`
}

export type TripPhase = 'ongoing' | 'upcoming' | 'past' | 'undated'

export function tripPhase(trip: TripRow, today = new Date()): TripPhase {
  if (!trip.start_date) return 'undated'
  const start = parseISO(trip.start_date)
  const end = trip.end_date ? parseISO(trip.end_date) : start
  if (differenceInCalendarDays(today, start) < 0) return 'upcoming'
  if (differenceInCalendarDays(today, end) > 0) return 'past'
  return 'ongoing'
}

export const PHASE_LABEL: Record<TripPhase, string> = {
  ongoing: '進行中',
  upcoming: '即將出發',
  past: '已結束',
  undated: '未排定日期',
}

/** 距離出發還有幾天；已出發或已結束回傳 null */
export function daysUntil(trip: TripRow, today = new Date()): number | null {
  if (!trip.start_date) return null
  const diff = differenceInCalendarDays(parseISO(trip.start_date), today)
  return diff > 0 ? diff : null
}
