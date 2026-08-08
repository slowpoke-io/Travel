'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { deleteExpense } from '@/actions/owner/expenses'
import { deleteImage } from '@/actions/owner/images'
import { ExpenseCard } from '@/components/expense/expense-card'
import { ExpenseFormSheet } from '@/components/expense/expense-form-sheet'
import {
  DayCategoryChart,
  TotalHeader,
  TripOverviewCharts,
} from '@/components/expense/expense-stats'
import { DayChip } from '@/components/trip/day-chip'
import { Lightbox } from '@/components/image/lightbox'
import { useTripAccess } from '@/components/trip/trip-access'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatMoney } from '@/lib/currency'
import {
  buildExpenseSummary,
  describeTotal,
  type MoneyTotal,
} from '@/lib/expense-summary'
import { dayColor } from '@/lib/constants'
import { formatDayLabel } from '@/lib/format'
import type { ExpenseWithImages } from '@/lib/queries'
import { sumMoney } from '@/lib/currency'
import type { ImageRow, TripDayRow, TripRow } from '@/lib/supabase/database.types'

const ALL = 'all'
/** 沒有指定天數的那一組。用固定字串當 key，才能跟真的 day id 一起放在同一個狀態裡 */
const NONE = 'none'

export function ExpenseView({
  trip,
  days,
  expenses,
}: {
  trip: TripRow
  days: TripDayRow[]
  expenses: ExpenseWithImages[]
}) {
  const router = useRouter()
  const { mode } = useTripAccess()
  // 花費一律只有擁有者能改。訪客即使拿到可編輯的分享連結也不行
  const canEdit = mode === 'owner'

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseWithImages | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ExpenseWithImages | null>(
    null,
  )
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{
    images: ImageRow[]
    index: number
  } | null>(null)
  const [deletingImage, startDeletingImage] = useTransition()

  /*
    看哪一天。'all' 是全部。

    一趟七天、每天八筆就有五十幾列，全部攤開要捲很久，而且找不到特定的一天。
    跟地圖分頁用同一組 chip，使用者不用重新學。
  */
  const [selectedDay, setSelectedDay] = useState<string>(ALL)

  const visible = useMemo(
    () =>
      selectedDay === ALL
        ? expenses
        : expenses.filter((e) => (e.day_id ?? NONE) === selectedDay),
    [expenses, selectedDay],
  )

  const isAll = selectedDay === ALL

  /* 「全部」看整趟的形狀 */
  const tripSummary = useMemo(
    () => buildExpenseSummary(expenses, days, trip.home_currency),
    [expenses, days, trip.home_currency],
  )

  /* 選了某一天時，圖表換成那一天的分類組成 */
  const daySummary = useMemo(
    () => buildExpenseSummary(visible, days, trip.home_currency),
    [visible, days, trip.home_currency],
  )

  /** 每個 chip 上要顯示的筆數 */
  const countByDay = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of expenses) {
      const key = e.day_id ?? NONE
      m[key] = (m[key] ?? 0) + 1
    }
    return m
  }, [expenses])

  /* 依天分組。沒有指定天數的歸「其他」，排在最後 */
  const groups = useMemo(() => {
    const byDay = new Map<string | null, ExpenseWithImages[]>()
    for (const e of visible) {
      const list = byDay.get(e.day_id)
      if (list) list.push(e)
      else byDay.set(e.day_id, [e])
    }
    const dayById = new Map(days.map((d) => [d.id, d] as const))
    return [...byDay]
      .map(([dayId, rows]) => {
        const day = dayId ? dayById.get(dayId) : undefined
        return {
          dayId,
          day,
          rows,
          total: buildGroupTotal(rows, trip.home_currency),
        }
      })
      .sort((a, b) => {
        if (!a.day) return 1
        if (!b.day) return -1
        return a.day.day_index - b.day.day_index
      })
  }, [visible, days, trip.home_currency])

  async function remove() {
    if (!confirmDelete) return false
    setRemovingId(confirmDelete.id)
    const result = await deleteExpense(trip.id, confirmDelete.id)
    if (!result.ok) {
      setRemovingId(null)
      toast.error('刪除失敗', { description: result.error })
      return false
    }
    toast.success('已刪除')
    router.refresh()
    return true
  }

  function removeImage(image: ImageRow) {
    startDeletingImage(async () => {
      const result = await deleteImage(trip.id, image.id)
      if (!result.ok) {
        toast.error('刪除失敗', { description: result.error })
        return
      }
      // 最後一張刪掉就把燈箱關起來，否則會停在空白畫面
      const rest = lightbox?.images.filter((i) => i.id !== image.id) ?? []
      setLightbox(rest.length ? { images: rest, index: 0 } : null)
      toast.success('已刪除圖片')
      router.refresh()
    })
  }

  function startAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <>
      <div className="border-b px-4 py-4">
        <p className="text-muted-foreground text-xs">
          總花費
          {tripSummary.count > 0 ? ` · ${tripSummary.count} 筆` : ''}
        </p>
        <div className="mt-1">
          <TotalHeader described={describeTotal(tripSummary.total)} />
        </div>
      </div>

      {/* 只有一天以上才需要切換 */}
      {expenses.length > 0 && days.length > 1 ? (
        <div className="no-scrollbar overflow-x-auto border-b">
          <div className="flex w-max gap-1.5 px-4 py-2">
            <DayChip
              active={selectedDay === ALL}
              onClick={() => setSelectedDay(ALL)}
              label="全部"
              sub={`${expenses.length} 筆`}
            />
            {days.map((day) => (
              <DayChip
                key={day.id}
                active={selectedDay === day.id}
                onClick={() => setSelectedDay(day.id)}
                label={`D${day.day_index}`}
                sub={`${countByDay[day.id] ?? 0} 筆`}
                color={dayColor(day.day_index)}
              />
            ))}
            {countByDay[NONE] ? (
              <DayChip
                active={selectedDay === NONE}
                onClick={() => setSelectedDay(NONE)}
                label="其他"
                sub={`${countByDay[NONE]} 筆`}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <main className="pb-24">
        {expenses.length === 0 ? (
          <EmptyExpenses canEdit={canEdit} onAdd={startAdd} />
        ) : isAll ? (
          /*
            「全部」只放圖，不列出每一筆。

            三百筆攤開是二十幾屏的牆，沒有人會用它找東西 —— 想看明細直接
            點上面的日期。這一頁回答的是「錢花去哪了」，明細那頁回答的是
            「那天買了什麼」，兩個不同的問題。
          */
          <div className="px-4 py-5">
            <TripOverviewCharts summary={tripSummary} />
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-5">
              <DayCategoryChart summary={daySummary} />
            </div>

            {groups.length === 0 ? (
              <p className="text-muted-foreground py-16 text-center text-sm">
                這一天還沒有花費
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.dayId ?? 'none'}>
                  <header className="bg-muted/95 supports-backdrop-filter:bg-muted/75 top-app-header sticky z-10 flex items-baseline justify-between px-4 py-1.5 backdrop-blur">
                    <h2 className="text-xs font-medium">
                      {group.day
                        ? `Day ${group.day.day_index}${
                            group.day.date
                              ? ` · ${formatDayLabel(group.day.date)}`
                              : ''
                          }`
                        : '其他'}
                    </h2>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatMoney(
                        describeTotal(group.total).primary.amount,
                        describeTotal(group.total).primary.currency,
                      )}
                    </span>
                  </header>

                  <ul className="divide-y">
                    {group.rows.map((expense) => (
                      <li key={expense.id}>
                        <ExpenseCard
                          expense={expense}
                          homeCurrency={trip.home_currency}
                          canEdit={canEdit}
                          removing={removingId === expense.id}
                          onEdit={() => {
                            setEditing(expense)
                            setFormOpen(true)
                          }}
                          onDelete={() => setConfirmDelete(expense)}
                          onOpenImages={() =>
                            expense.images.length &&
                            setLightbox({ images: expense.images, index: 0 })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </main>

      {canEdit ? (
        <div className="bottom-above-nav pointer-events-none fixed inset-x-0 z-20 mx-auto flex max-w-md justify-end px-4 pb-3">
          <Button
            size="lg"
            onClick={startAdd}
            className="pointer-events-auto h-13 gap-2 rounded-full pr-6 pl-5 shadow-lg"
          >
            <Plus className="size-5" aria-hidden />
            記一筆
          </Button>
        </div>
      ) : null}

      {canEdit ? (
        <ExpenseFormSheet
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) setEditing(null)
          }}
          trip={trip}
          days={days}
          expense={editing}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(next) => !next && setConfirmDelete(null)}
        title="刪除這筆花費？"
        description="這筆花費的圖片也會一起刪除，無法復原。"
        confirmLabel="刪除"
        destructive
        onConfirm={remove}
      />

      {lightbox ? (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          canEdit={canEdit}
          pending={deletingImage}
          // 花費的圖片沒有封面的概念，只留刪除
          allowCover={false}
          onMakeCover={() => {}}
          onDelete={removeImage}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  )
}

/** 一組花費的總額。跟整趟的算法一樣，只是範圍縮到一天 */
function buildGroupTotal(
  rows: ExpenseWithImages[],
  homeCurrency: string,
): MoneyTotal {
  const perCurrency = new Map<string, number[]>()
  for (const r of rows) {
    const list = perCurrency.get(r.currency)
    if (list) list.push(r.amount)
    else perCurrency.set(r.currency, [r.amount])
  }
  return {
    home: sumMoney(
      rows.map((r) => r.amount_home),
      homeCurrency,
    ),
    homeCurrency,
    byCurrency: [...perCurrency]
      .map(([currency, amounts]) => ({
        currency,
        amount: sumMoney(amounts, currency),
      }))
      .sort((a, b) => b.amount - a.amount),
  }
}

function EmptyExpenses({
  canEdit,
  onAdd,
}: {
  canEdit: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        <Wallet className="text-muted-foreground size-6" aria-hidden />
      </div>
      <p className="mt-4 font-medium">還沒有任何花費</p>
      {canEdit ? (
        <Button onClick={onAdd} className="mt-5 gap-2">
          <Plus className="size-4" aria-hidden />
          記一筆
        </Button>
      ) : null}
    </div>
  )
}
