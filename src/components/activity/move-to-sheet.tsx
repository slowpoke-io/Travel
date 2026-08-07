'use client'

import { useState, useTransition } from 'react'
import { Check, Inbox, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { formatDayLabel } from '@/lib/format'
import type { TripDayRow } from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 要搬移的行程；支援多選批次搬移 */
  activityIds: string[]
  days: TripDayRow[]
  /** 目前所在的容器，會顯示為「目前位置」 */
  currentDayId: string | null
  /** dayId → 行程數；null key 代表儲備區 */
  counts: Record<string, number>
  backlogCount: number
  onMoved?: () => void
}

/**
 * 「移動到…」底部彈窗。
 *
 * 天數一多時，拖曳跨天不切實際 —— 這個清單才是主要的搬移路徑，
 * 拖曳只負責同一天內的順序與儲備區進出。
 */
export function MoveToSheet({
  open,
  onOpenChange,
  activityIds,
  days,
  currentDayId,
  counts,
  backlogCount,
  onMoved,
}: Props) {
  const mutations = useTripMutations()
  const [pending, startTransition] = useTransition()
  /** 正在搬去哪一個容器；只有那一列顯示等待 */
  const [movingTo, setMovingTo] = useState<string | null>(null)

  function moveTo(targetDayId: string | null, label: string) {
    if (targetDayId === currentDayId) {
      onOpenChange(false)
      return
    }
    setMovingTo(targetDayId ?? 'backlog')
    startTransition(async () => {
      const result = await mutations.moveActivities(activityIds, targetDayId)
      setMovingTo(null)
      if (!result.ok) {
        toast.error('搬移失敗', { description: result.error })
        return
      }
      toast.success(
        activityIds.length > 1
          ? `已把 ${activityIds.length} 個行程移到${label}`
          : `已移到${label}`,
      )
      onOpenChange(false)
      onMoved?.()
    })
  }

  const options = [
    {
      id: null,
      title: '行程儲備區',
      subtitle: `${backlogCount} 個行程`,
      icon: true,
    },
    ...days.map((day) => ({
      id: day.id,
      title: `Day ${day.day_index}${day.title ? ` · ${day.title}` : ''}`,
      subtitle: [
        day.date ? formatDayLabel(day.date) : null,
        `${counts[day.id] ?? 0} 個行程`,
      ]
        .filter(Boolean)
        .join(' · '),
      icon: false,
    })),
  ]

  return (
    <Drawer open={open} onOpenChange={onOpenChange} busy={pending}>
      <DrawerContent className="max-h-[80dvh]">
        <DrawerHeader>
          <DrawerTitle>移動到…</DrawerTitle>
          <DrawerDescription>
            {activityIds.length > 1
              ? `已選取 ${activityIds.length} 個行程`
              : '選擇要移到哪一天'}
          </DrawerDescription>
        </DrawerHeader>

        <ul className="pb-safe overflow-y-auto overscroll-contain px-2 pb-4">
          {options.map((opt) => {
            const isCurrent = opt.id === currentDayId
            return (
              <li key={opt.id ?? 'backlog'}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => moveTo(opt.id, opt.title)}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    isCurrent ? 'bg-muted' : 'active:bg-muted',
                    // 只淡化沒被點的，被點的那一列保持清楚
                    pending &&
                      movingTo !== (opt.id ?? 'backlog') &&
                      'opacity-40',
                  )}
                >
                  {opt.icon ? (
                    <Inbox
                      className="text-muted-foreground size-5 shrink-0"
                      aria-hidden
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {opt.title}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {opt.subtitle}
                    </span>
                  </span>
                  {isCurrent ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      目前位置
                    </span>
                  ) : movingTo === (opt.id ?? 'backlog') ? (
                    <Loader2
                      className="size-4 shrink-0 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <Check className="size-4 shrink-0 opacity-0" aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </DrawerContent>
    </Drawer>
  )
}
