'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import {
  Clock,
  ExternalLink,
  ImagePlus,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  /*
    刪除成功後卡片仍會停留到資料更新為止，所以維持淡出＋轉圈，
    不要讓它看起來像「還沒被刪」。
  */
  const [removing, setRemoving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const meta = categoryMeta(activity.category)
  const CategoryIcon = meta.icon
  const cover = pickCover(activity.images)
  const coverUrl = cover ? getThumbUrl(cover) : null
  const activityTags = tags.filter((t) => activity.tagIds.includes(t.id))

  async function remove() {
    setRemoving(true)
    const result = await mutations.deleteActivity(activity.id)
    if (!result.ok) {
      setRemoving(false)
      toast.error('刪除失敗', { description: result.error })
      return false
    }
    toast.success('已刪除行程')
    return true
  }

  return (
    <article
      className={cn(
        'bg-card relative overflow-hidden rounded-xl border transition-opacity',
        removing && 'opacity-60',
      )}
    >
      {/* 刪除中：蓋一層並顯示轉圈，讓人知道是在處理而不是卡住 */}
      {removing ? (
        <div className="bg-background/40 absolute inset-0 z-10 flex items-center justify-center">
          <Loader2
            className="text-foreground size-5 animate-spin"
            aria-hidden
          />
        </div>
      ) : null}

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

        {/* 沒有序號徽章時（儲備區）左側要自己補內距，否則內容會貼著卡片邊緣 */}
        <div
          className={cn(
            'min-w-0 flex-1 py-3 pr-2',
            order === undefined && 'pl-3',
          )}
        >
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

                {/*
                  重要時間（班機、訂位…）。這些是錯過會有代價的時間，
                  所以在卡片上要看得到，而不是要點進詳情才發現。
                */}
                {activity.times.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                  >
                    <Clock className="size-3" aria-hidden />
                    {t.label ? `${t.label} ` : ''}
                    {t.time}
                  </span>
                ))}
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

            {/*
              縮圖的位置一律保留。沒有圖時改放分類色塊，
              否則有圖與沒圖的卡片高度不一樣，列表看起來會參差不齊。
            */}
            <Link
              href={`${base}/a/${activity.id}`}
              aria-hidden
              tabIndex={-1}
              className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg"
            >
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <span
                  className="flex size-full items-center justify-center"
                  style={{ backgroundColor: `${meta.marker}1a` }}
                >
                  <CategoryIcon
                    className="size-7 opacity-40"
                    style={{ color: meta.marker }}
                    aria-hidden
                  />
                </span>
              )}
            </Link>

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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`刪除「${activity.title}」？`}
        description="這個行程與它的圖片都會一起刪除，無法復原。"
        confirmLabel="刪除"
        destructive
        onConfirm={remove}
      />
    </article>
  )
}
