import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, ImageOff, MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { getImageUrl } from '@/lib/image-url'
import { daysUntil, formatDateRange, tripPhase } from '@/lib/format'
import type { TripListItem } from '@/lib/queries'

export function TripCard({ trip }: { trip: TripListItem }) {
  const cover = getImageUrl(trip.coverThumbPath ?? trip.coverPath)
  const phase = tripPhase(trip)
  const countdown = daysUntil(trip)

  return (
    <Link
      // 點旅遊直接進「行程」分頁 —— 那是實際會待著的地方。
      // 概覽仍在，從內頁上方的標題點進去。
      href={`/trips/${trip.id}/d/1`}
      className="group focus-visible:ring-ring bg-card block overflow-hidden rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none active:opacity-90"
    >
      <div className="bg-muted relative aspect-[16/9] w-full">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 384px"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}

        {phase === 'ongoing' ? (
          <Badge className="absolute top-3 left-3 bg-emerald-600 text-white hover:bg-emerald-600">
            進行中
          </Badge>
        ) : countdown !== null ? (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 backdrop-blur"
          >
            還有 {countdown} 天
          </Badge>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="truncate text-base font-semibold">{trip.title}</h3>

        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {trip.destination ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {trip.destination}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDateRange(trip.start_date, trip.end_date)}
          </span>
        </div>

        <p className="text-muted-foreground mt-2 text-xs">
          {trip.dayCount} 天 · {trip.activityCount} 個行程
          {trip.share_enabled ? ' · 已分享' : ''}
        </p>
      </div>
    </Link>
  )
}
