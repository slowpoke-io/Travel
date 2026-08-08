'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { ChartNoAxesColumn, Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { deleteExpense } from '@/actions/owner/expenses'
import { deleteImage } from '@/actions/owner/images'
import { ExpenseCard } from '@/components/expense/expense-card'
import { ExpenseFormSheet } from '@/components/expense/expense-form-sheet'
import { ExpenseStats, TotalHeader } from '@/components/expense/expense-stats'
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
import { formatDayLabel } from '@/lib/format'
import type { ExpenseWithImages } from '@/lib/queries'
import { sumMoney } from '@/lib/currency'
import type { ImageRow, TripDayRow, TripRow } from '@/lib/supabase/database.types'

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
  const [showStats, setShowStats] = useState(false)

  const summary = useMemo(
    () => buildExpenseSummary(expenses, days, trip.home_currency),
    [expenses, days, trip.home_currency],
  )

  /* 依天分組。沒有指定天數的歸「其他」，排在最後 */
  const groups = useMemo(() => {
    const byDay = new Map<string | null, ExpenseWithImages[]>()
    for (const e of expenses) {
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
  }, [expenses, days, trip.home_currency])

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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              總花費
              {summary.count > 0 ? ` · ${summary.count} 筆` : ''}
            </p>
            <div className="mt-1">
              <TotalHeader described={describeTotal(summary.total)} />
            </div>
          </div>

          {summary.count > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats((v) => !v)}
              aria-pressed={showStats}
              className="shrink-0 gap-1.5"
            >
              <ChartNoAxesColumn className="size-4" aria-hidden />
              統計
            </Button>
          ) : null}
        </div>

        {showStats ? (
          <div className="mt-5">
            <ExpenseStats summary={summary} />
          </div>
        ) : null}
      </div>

      <main className="pb-24">
        {expenses.length === 0 ? (
          <EmptyExpenses canEdit={canEdit} onAdd={startAdd} />
        ) : (
          groups.map((group) => (
            <section key={group.dayId ?? 'none'}>
              <header className="bg-muted/40 flex items-baseline justify-between px-4 py-1.5">
                <h2 className="text-xs font-medium">
                  {group.day
                    ? `Day ${group.day.day_index}${
                        group.day.date ? ` · ${formatDayLabel(group.day.date)}` : ''
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
