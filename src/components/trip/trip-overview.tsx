'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, ChevronRight, Inbox, MapPin, Share2 } from 'lucide-react'

import { useBasePath, useTripAccess } from '@/components/trip/trip-access'
import { Badge } from '@/components/ui/badge'
import { formatDateRange, formatDayLabel } from '@/lib/format'
import { getImageUrl, pickCover } from '@/lib/image-url'
import type { ActivityWithRelations } from '@/lib/queries'
import type {
  ImageRow,
  TripDayRow,
  TripRow,
} from '@/lib/supabase/database.types'

export function TripOverview({
  trip,
  days,
  byDay,
  backlogCount,
  totalActivities,
  tripImages,
}: {
  trip: TripRow
  days: TripDayRow[]
  byDay: Record<string, ActivityWithRelations[]>
  backlogCount: number
  totalActivities: number
  tripImages: ImageRow[]
}) {
  const base = useBasePath()
  const { mode } = useTripAccess()
  const cover = pickCover(tripImages)
  const coverUrl = cover ? getImageUrl(cover.path) : null

  return (
    <main className="pb-24">
      {coverUrl ? (
        <div className="bg-muted relative aspect-[16/10] w-full">
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            priority
            className="object-cover"
          />
        </div>
      ) : null}

      <section className="px-5 pt-5">
        <h2 className="text-2xl font-bold tracking-tight">{trip.title}</h2>

        <div className="text-muted-foreground mt-2 space-y-1 text-sm">
          {trip.destination ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              {trip.destination}
            </p>
          ) : null}
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            {formatDateRange(trip.start_date, trip.end_date)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{days.length} 天</Badge>
          <Badge variant="secondary">{totalActivities} 個行程</Badge>
          {backlogCount > 0 ? (
            <Badge variant="secondary" className="gap-1">
              <Inbox className="size-3" aria-hidden />
              儲備區 {backlogCount}
            </Badge>
          ) : null}
          {mode === 'owner' && trip.share_enabled ? (
            <Badge variant="secondary" className="gap-1">
              <Share2 className="size-3" aria-hidden />
              {trip.share_can_edit ? '已分享・可編輯' : '已分享・唯讀'}
            </Badge>
          ) : null}
        </div>

        {trip.summary ? (
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed whitespace-pre-wrap">
            {trip.summary}
          </p>
        ) : null}
      </section>

      {backlogCount > 0 ? (
        <section className="px-5 pt-6">
          <Link
            href={`${base}/backlog`}
            className="bg-muted/60 active:bg-muted flex items-center gap-3 rounded-xl border p-4"
          >
            <Inbox
              className="text-muted-foreground size-5 shrink-0"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">行程儲備區</span>
              <span className="text-muted-foreground block text-xs">
                {backlogCount} 個想去的地方還沒排進行程
              </span>
            </span>
            <ChevronRight
              className="text-muted-foreground size-4"
              aria-hidden
            />
          </Link>
        </section>
      ) : null}

      <section className="px-5 pt-6">
        <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
          每日行程
        </h3>
        <ul className="space-y-2">
          {days.map((day) => {
            const activities = byDay[day.id] ?? []
            return (
              <li key={day.id}>
                <Link
                  href={`${base}/d/${day.day_index}`}
                  className="active:bg-muted flex items-start gap-3 rounded-xl border p-4"
                >
                  <span className="bg-muted flex size-11 shrink-0 flex-col items-center justify-center rounded-lg">
                    <span className="text-[10px] leading-none opacity-70">
                      DAY
                    </span>
                    <span className="text-base leading-tight font-bold">
                      {day.day_index}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-medium">
                        {day.title ?? `第 ${day.day_index} 天`}
                      </span>
                      {day.date ? (
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {formatDayLabel(day.date)}
                        </span>
                      ) : null}
                    </span>

                    {activities.length ? (
                      <span className="text-muted-foreground mt-1 block truncate text-xs">
                        {activities
                          .slice(0, 3)
                          .map((a) => a.title)
                          .join(' → ')}
                        {activities.length > 3
                          ? ` … 共 ${activities.length} 個`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground mt-1 block text-xs">
                        還沒安排行程
                      </span>
                    )}
                  </span>

                  <ChevronRight
                    className="text-muted-foreground mt-1 size-4 shrink-0"
                    aria-hidden
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
