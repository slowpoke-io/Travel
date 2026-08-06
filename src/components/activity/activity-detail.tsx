'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
  MapPin,
  Navigation,
  Pencil,
} from 'lucide-react'

import { ActivityFormSheet } from '@/components/activity/activity-form-sheet'
import { MoveToSheet } from '@/components/activity/move-to-sheet'
import { ImageGallery } from '@/components/image/image-gallery'
import { useBasePath, useTripAccess } from '@/components/trip/trip-access'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { categoryMeta, tagColorClass } from '@/lib/constants'

import { getImageUrl, pickCover } from '@/lib/image-url'
import type { ActivityWithRelations } from '@/lib/queries'
import type { TagRow, TripDayRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

export function ActivityDetail({
  activity,
  tags,
  days,
  counts,
  backlogCount,
  placeSearchEnabled,
}: {
  activity: ActivityWithRelations
  tags: TagRow[]
  days: TripDayRow[]
  counts: Record<string, number>
  backlogCount: number
  placeSearchEnabled: boolean
}) {
  const router = useRouter()
  const base = useBasePath()
  const { canEdit } = useTripAccess()
  const [editOpen, setEditOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)

  const meta = categoryMeta(activity.category)
  const CategoryIcon = meta.icon
  const cover = pickCover(activity.images)
  const coverUrl = cover ? getImageUrl(cover.path) : null
  const activityTags = tags.filter((t) => activity.tagIds.includes(t.id))
  const currentDay = days.find((d) => d.id === activity.day_id)

  // 有座標就用座標導航（最準），否則退回用地址搜尋
  const mapsQuery =
    activity.lat !== null && activity.lng !== null
      ? `${activity.lat},${activity.lng}`
      : (activity.address ?? activity.place_name ?? activity.title)

  return (
    <>
      <div className="pb-28">
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
            <Link
              href={
                currentDay
                  ? `${base}/d/${currentDay.day_index}`
                  : `${base}/backlog`
              }
              aria-label="返回"
              className="pt-safe absolute top-2 left-2 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
          </div>
        ) : null}

        <div className="space-y-6 px-5 pt-5">
          <header>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl leading-tight font-bold">
                {activity.title}
              </h2>
              {canEdit ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditOpen(true)}
                  aria-label="編輯行程"
                  className="shrink-0"
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                  meta.chip,
                )}
              >
                <CategoryIcon className="size-3.5" aria-hidden />
                {meta.label}
              </span>

              {activity.times.map((t, i) => (
                <Badge
                  key={i}
                  className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200"
                >
                  <Clock className="size-3" aria-hidden />
                  {t.label ? `${t.label} ` : ''}
                  {t.time}
                </Badge>
              ))}

              {activityTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className={cn('font-normal', tagColorClass(tag.color))}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>

            {/*
              原本是一行加了底線的文字，看起來像誤植的超連結。
              改成正常的一列：左邊說明現在在哪，右邊是明確的動作。
            */}
            {canEdit ? (
              <button
                type="button"
                onClick={() => setMoveOpen(true)}
                className="hover:bg-muted/60 active:bg-muted mt-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
              >
                {currentDay ? (
                  <span className="bg-muted flex size-9 shrink-0 flex-col items-center justify-center rounded-lg">
                    <span className="text-[9px] leading-none opacity-70">
                      DAY
                    </span>
                    <span className="text-sm leading-tight font-bold">
                      {currentDay.day_index}
                    </span>
                  </span>
                ) : (
                  <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Inbox className="size-4" aria-hidden />
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="text-muted-foreground block text-[11px]">
                    目前在
                  </span>
                  <span className="block truncate text-sm font-medium">
                    {currentDay
                      ? (currentDay.title ?? `第 ${currentDay.day_index} 天`)
                      : '行程儲備區'}
                  </span>
                </span>

                <span className="text-muted-foreground flex shrink-0 items-center gap-0.5 text-xs">
                  移動
                  <ChevronRight className="size-4" aria-hidden />
                </span>
              </button>
            ) : null}
          </header>

          {activity.place_name || activity.address ? (
            <section className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                地點
              </h3>
              <div className="rounded-xl border p-4">
                <p className="flex items-start gap-2 text-sm font-medium">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {activity.place_name ?? '（未命名地點）'}
                </p>
                {activity.address ? (
                  <p className="text-muted-foreground mt-1 pl-6 text-sm">
                    {activity.address}
                  </p>
                ) : null}

                {/*
                  這兩個只是連到 google.com/maps 的外部連結，不需要 API 金鑰，
                  所以不能跟地圖元件一樣被 placeSearchEnabled 擋住。
                */}
                <div className="mt-3 flex gap-2 pl-6">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  >
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}${
                        activity.google_place_id
                          ? `&query_place_id=${activity.google_place_id}`
                          : ''
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      在地圖開啟
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  >
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="size-3.5" aria-hidden />
                      導航
                    </a>
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {activity.links.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                連結
              </h3>
              <ul className="space-y-2">
                {activity.links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="active:bg-muted flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
                    >
                      <ExternalLink
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {link.label || link.url}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {activity.notes ? (
            <section className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                備註
              </h3>
              <p className="rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {activity.notes}
              </p>
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              圖片
            </h3>
            <ImageGallery activityId={activity.id} images={activity.images} />
          </section>
        </div>
      </div>

      <ActivityFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        dayId={activity.day_id}
        activity={activity}
        tags={tags}
        placeSearchEnabled={placeSearchEnabled}
        onSaved={() => router.refresh()}
      />

      <MoveToSheet
        open={moveOpen}
        onOpenChange={setMoveOpen}
        activityIds={[activity.id]}
        days={days}
        currentDayId={activity.day_id}
        counts={counts}
        backlogCount={backlogCount}
        onMoved={() => router.refresh()}
      />
    </>
  )
}
