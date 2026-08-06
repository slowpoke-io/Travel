'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { addTripDay, deleteTripDay } from '@/actions/owner/trips'
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
import { Button } from '@/components/ui/button'
import { formatDayLabel } from '@/lib/format'
import type { TripDayRow } from '@/lib/supabase/database.types'

export function DayManager({
  tripId,
  days,
  counts,
}: {
  tripId: string
  days: TripDayRow[]
  counts: Record<string, number>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<TripDayRow | null>(null)

  function add() {
    startTransition(async () => {
      const result = await addTripDay(tripId, null)
      if (!result.ok) {
        toast.error('新增失敗', { description: result.error })
        return
      }
      toast.success('已加一天')
      router.refresh()
    })
  }

  function remove(day: TripDayRow) {
    startTransition(async () => {
      const result = await deleteTripDay(tripId, day.id)
      if (!result.ok) {
        toast.error('刪除失敗', { description: result.error })
        return
      }
      const moved = counts[day.id] ?? 0
      toast.success(
        moved > 0
          ? `已刪除 Day ${day.day_index}，${moved} 個行程已退回儲備區`
          : `已刪除 Day ${day.day_index}`,
      )
      setConfirm(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-xl border">
        {days.map((day) => (
          <li key={day.id} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                Day {day.day_index}
                {day.title ? ` · ${day.title}` : ''}
              </span>
              <span className="text-muted-foreground block text-xs">
                {[
                  day.date ? formatDayLabel(day.date) : null,
                  `${counts[day.id] ?? 0} 個行程`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending || days.length <= 1}
              onClick={() => setConfirm(day)}
              aria-label={`刪除 Day ${day.day_index}`}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <Button
        variant="outline"
        onClick={add}
        disabled={pending}
        className="w-full gap-2"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="size-4" aria-hidden />
        )}
        加一天
      </Button>
      <p className="text-muted-foreground text-xs">
        直接修改上方的旅遊日期也會自動增減天數。
      </p>

      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              刪除 Day {confirm?.day_index}？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm && (counts[confirm.id] ?? 0) > 0
                ? `這一天的 ${counts[confirm.id]} 個行程會退回「行程儲備區」，不會被刪除。之後的天數會往前遞補。`
                : '之後的天數會往前遞補。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirm) remove(confirm)
              }}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              刪除這一天
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
