'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  Clock,
  ExternalLink,
  ImagePlus,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBasePath, useTripAccess } from '@/components/trip/trip-access'
import { categoryMeta, tagColorClass } from '@/lib/constants'
import { formatDurationShort, formatTime } from '@/lib/format'
import { getThumbUrl, pickCover } from '@/lib/image-url'
import type { ActivityWithRelations } from '@/lib/queries'
import type { TagRow } from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'
import { cn } from '@/lib/utils'

type Props = {
  activity: ActivityWithRelations
  tags: TagRow[]
  /** 顯示在左側的序號（地圖標記編號與此一致）；儲備區不顯示 */
  order?: number
  /** 儲備區的快速指派列 */
  quickAssign?: React.ReactNode
  onEdit: () => void
  onMove: () => void
  onAddImage: () => void
}

export function ActivityCard({
  activity,
  tags,
  order,
  quickAssign,
  onEdit,
  onMove,
  onAddImage,
}: Props) {
  const base = useBasePath()
  const { canEdit } = useTripAccess()
  const mutations = useTripMutations()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const meta = categoryMeta(activity.category)
  const CategoryIcon = meta.icon
  const cover = pickCover(activity.images)
  const coverUrl = cover ? getThumbUrl(cover) : null
  const activityTags = tags.filter((t) => activity.tagIds.includes(t.id))

  function remove() {
    startTransition(async () => {
      const result = await mutations.deleteActivity(activity.id)
      if (result.ok) toast.success('已刪除行程')
      else toast.error('刪除失敗', { description: result.error })
      setConfirmOpen(false)
    })
  }

  return (
    <article
      className={cn(
        'bg-card overflow-hidden rounded-xl border',
        pending && 'opacity-50',
      )}
    >
      <div className="flex">
        {order !== undefined ? (
          <div className="flex w-11 shrink-0 justify-center pt-4">
            <span
              className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: meta.marker }}
              aria-label={`第 ${order} 個行程`}
            >
              {order}
            </span>
          </div>
        ) : null}

        <div className="min-w-0 flex-1 py-3 pr-2">
          <div className="flex items-start gap-3">
            <Link
              href={`${base}/a/${activity.id}`}
              className="min-w-0 flex-1 focus-visible:underline focus-visible:outline-none"
            >
              <h3 className="truncate leading-snug font-semibold">
                {activity.title}
              </h3>

              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium',
                    meta.chip,
                  )}
                >
                  <CategoryIcon className="size-3" aria-hidden />
                  {meta.label}
                </span>

                {activity.start_time || activity.duration_minutes ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" aria-hidden />
                    {formatTime(activity.start_time)}
                    {activity.start_time && activity.duration_minutes
                      ? ' · '
                      : ''}
                    {formatDurationShort(activity.duration_minutes)}
                  </span>
                ) : null}
              </div>

              {activity.place_name || activity.address ? (
                <p className="text-muted-foreground mt-1.5 flex items-start gap-1 text-xs">
                  <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span className="line-clamp-1-safe">
                    {activity.place_name ?? activity.address}
                  </span>
                </p>
              ) : null}

              {activityTags.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {activityTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className={cn(
                        'h-5 px-1.5 text-[10px] font-normal',
                        tagColorClass(tag.color),
                      )}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </Link>

            {coverUrl ? (
              <Link
                href={`${base}/a/${activity.id}`}
                className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg"
              >
                <Image
                  src={coverUrl}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </Link>
            ) : null}

            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={`${activity.title} 的操作選單`}
                  >
                    <MoreVertical className="size-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="size-4" aria-hidden />
                    編輯
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onMove}>
                    <ExternalLink className="size-4" aria-hidden />
                    移動到…
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onAddImage}>
                    <ImagePlus className="size-4" aria-hidden />
                    加入圖片
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirmOpen(true)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    刪除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {quickAssign}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除「{activity.title}」？</AlertDialogTitle>
            <AlertDialogDescription>
              這個行程與它的圖片都會一起刪除，無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
