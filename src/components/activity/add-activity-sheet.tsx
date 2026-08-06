'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Inbox, Loader2, PencilLine } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { categoryMeta } from '@/lib/constants'
import type { ActivityWithRelations } from '@/lib/queries'
import { useTripMutations } from '@/lib/use-trip-mutations'

type Mode = 'menu' | 'backlog'

/**
 * 「新增行程」的選單。
 *
 * 只有兩件真正不同的事：「建一個新的」與「從儲備區撈既有的」。
 * 表單裡本來就同時提供地點搜尋與手動輸入，把它們拆成兩個選項是多餘的
 * ——那兩個選項會開出一模一樣的畫面。
 *
 * 建立新行程的表單由呼叫端持有（透過 onCreateNew 觸發）。這樣一來，
 * 儲備區是空的時候呼叫端可以直接開表單、根本不顯示這個選單，
 * 而不需要在這裡於 render 期間去改父層的狀態。
 */
export function AddActivitySheet({
  open,
  onOpenChange,
  dayId,
  dayLabel,
  backlogActivities,
  mapsEnabled,
  onCreateNew,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayId: string
  dayLabel: string
  backlogActivities: ActivityWithRelations[]
  mapsEnabled: boolean
  onCreateNew: () => void
}) {
  const router = useRouter()
  const mutations = useTripMutations()
  const [mode, setMode] = useState<Mode>('menu')
  const [picked, setPicked] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  function reset() {
    setMode('menu')
    setPicked([])
  }

  function openForm() {
    onOpenChange(false)
    onCreateNew()
  }

  function addFromBacklog() {
    if (!picked.length) return
    startTransition(async () => {
      const result = await mutations.moveActivities(picked, dayId)
      if (!result.ok) {
        toast.error('加入失敗', { description: result.error })
        return
      }
      toast.success(`已把 ${picked.length} 個行程加入 ${dayLabel}`)
      onOpenChange(false)
      reset()
      router.refresh()
    })
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) reset()
        }}
      >
        <DrawerContent className={mode === 'backlog' ? 'h-[80dvh]' : undefined}>
          {mode === 'menu' ? (
            <>
              <DrawerHeader>
                <DrawerTitle>新增行程到 {dayLabel}</DrawerTitle>
              </DrawerHeader>

              <div className="space-y-2 px-4 pb-6">
                <MenuButton
                  icon={PencilLine}
                  title="建立新行程"
                  hint={
                    mapsEnabled
                      ? '搜尋地點自動帶入座標，或自己輸入'
                      : '輸入名稱、時間與備註'
                  }
                  onClick={openForm}
                />
                <MenuButton
                  icon={Inbox}
                  title="從儲備區挑選"
                  hint={`儲備區有 ${backlogActivities.length} 個想去的地方`}
                  onClick={() => setMode('backlog')}
                />
              </div>
            </>
          ) : (
            <>
              <DrawerHeader className="border-b py-3">
                <DrawerTitle className="text-base">從儲備區挑選</DrawerTitle>
                <DrawerDescription>
                  勾選後一次加入 {dayLabel}
                </DrawerDescription>
              </DrawerHeader>

              <ul className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
                {backlogActivities.map((activity) => {
                  const meta = categoryMeta(activity.category)
                  const Icon = meta.icon
                  const checked = picked.includes(activity.id)
                  return (
                    <li key={activity.id}>
                      <label className="active:bg-muted flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setPicked((prev) =>
                              v
                                ? [...prev, activity.id]
                                : prev.filter((id) => id !== activity.id),
                            )
                          }
                        />
                        <Icon
                          className="size-4 shrink-0"
                          style={{ color: meta.marker }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {activity.title}
                          </span>
                          {activity.place_name || activity.address ? (
                            <span className="text-muted-foreground block truncate text-xs">
                              {activity.place_name ?? activity.address}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>

              <div className="pb-safe flex gap-2 border-t px-4 py-3">
                <Button
                  variant="outline"
                  onClick={() => setMode('menu')}
                  className="flex-1"
                >
                  返回
                </Button>
                <Button
                  onClick={addFromBacklog}
                  disabled={pending || picked.length === 0}
                  className="flex-[2]"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  加入 {picked.length ? `${picked.length} 個` : ''}行程
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}

function MenuButton({
  icon: Icon,
  title,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="active:bg-muted flex min-h-16 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-50"
    >
      <Icon className="text-muted-foreground size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block text-xs">{hint}</span>
      </span>
    </button>
  )
}
