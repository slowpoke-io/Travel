'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Inbox, Loader2, PencilLine, Search } from 'lucide-react'
import { toast } from 'sonner'

import { ActivityFormSheet } from '@/components/activity/activity-form-sheet'
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
import type { TagRow } from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'

type Mode = 'menu' | 'backlog'

/**
 * 新增行程的入口。三條路徑：
 *   1. 搜尋地點 — 直接開表單，游標落在地點搜尋
 *   2. 手動輸入 — 開表單
 *   3. 從儲備區挑 — 多選後一次加入當天
 */
export function AddActivitySheet({
  open,
  onOpenChange,
  dayId,
  dayLabel,
  backlogActivities,
  tags,
  mapsEnabled,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayId: string
  dayLabel: string
  backlogActivities: ActivityWithRelations[]
  tags: TagRow[]
  mapsEnabled: boolean
}) {
  const router = useRouter()
  const mutations = useTripMutations()
  const [mode, setMode] = useState<Mode>('menu')
  const [formOpen, setFormOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  function reset() {
    setMode('menu')
    setPicked([])
  }

  function openForm() {
    onOpenChange(false)
    setFormOpen(true)
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
                {mapsEnabled ? (
                  <MenuButton
                    icon={Search}
                    title="搜尋地點"
                    hint="自動帶入名稱、地址與座標"
                    onClick={openForm}
                  />
                ) : null}
                <MenuButton
                  icon={PencilLine}
                  title="手動輸入"
                  hint="自己填標題與備註"
                  onClick={openForm}
                />
                <MenuButton
                  icon={Inbox}
                  title="從儲備區挑選"
                  hint={
                    backlogActivities.length
                      ? `儲備區有 ${backlogActivities.length} 個想去的地方`
                      : '儲備區目前是空的'
                  }
                  disabled={backlogActivities.length === 0}
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

      <ActivityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        dayId={dayId}
        tags={tags}
        mapsEnabled={mapsEnabled}
        onSaved={() => router.refresh()}
      />
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
