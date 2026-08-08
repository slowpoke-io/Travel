'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  commitExpenseImages,
  createExpense,
  updateExpense,
} from '@/actions/owner/expenses'
import { deleteImage } from '@/actions/owner/images'
import { PendingImagePicker } from '@/components/image/pending-image-picker'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/full-screen-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CURRENCY_LIST,
  currencyDigits,
  currencyMeta,
  formatApprox,
  roundTo,
} from '@/lib/currency'
import { EXPENSE_CATEGORIES } from '@/lib/expense-constants'
import { getThumbUrl } from '@/lib/image-url'
import type { ExpenseWithImages } from '@/lib/queries'
import type {
  ExpenseCategory,
  ImageRow,
  TripDayRow,
  TripRow,
} from '@/lib/supabase/database.types'
import { usePendingUploads } from '@/lib/use-pending-uploads'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip: TripRow
  days: TripDayRow[]
  /** 有值代表編輯既有的 */
  expense?: ExpenseWithImages | null
  /** 新增時預設掛在哪一天 */
  defaultDayId?: string | null
}

export function ExpenseFormSheet({ open, ...rest }: Props) {
  const [busy, setBusy] = useState(false)

  return (
    <FullScreenSheet
      open={open}
      onOpenChange={rest.onOpenChange}
      busy={busy}
      title={rest.expense ? '編輯花費' : '記一筆'}
    >
      {/* key 讓每次開啟都重新掛載，初始值由 useState 初始化函式帶入 */}
      <Body key={rest.expense?.id ?? 'new'} {...rest} onBusyChange={setBusy} />
    </FullScreenSheet>
  )
}

function Body({
  onOpenChange,
  trip,
  days,
  expense,
  defaultDayId = null,
  onBusyChange,
}: Omit<Props, 'open'> & { onBusyChange: (busy: boolean) => void }) {
  const router = useRouter()
  const uploads = usePendingUploads(trip.id)
  const [pending, startTransition] = useTransition()

  const isEdit = Boolean(expense)

  /*
    幣別預設用這趟的當地幣別。去韓國記帳十次有九次是 ₩，
    每次都要先選一次幣別的話這個功能就不會被用。
  */
  const [currency, setCurrency] = useState(
    () => expense?.currency ?? trip.local_currency ?? trip.home_currency,
  )
  const [amount, setAmount] = useState(() =>
    expense ? stripTrailingZeros(expense.amount, expense.currency) : '',
  )
  const [category, setCategory] = useState<ExpenseCategory>(
    () => expense?.category ?? 'food',
  )
  const [dayId, setDayId] = useState<string | null>(
    () => expense?.day_id ?? defaultDayId,
  )
  const [title, setTitle] = useState(() => expense?.title ?? '')
  const [note, setNote] = useState(() => expense?.note ?? '')

  const busy = pending || uploads.uploading
  useEffect(() => {
    onBusyChange(busy)
    return () => onBusyChange(false)
  }, [busy, onBusyChange])

  // 表單關掉（而不是送出成功）時，把已經傳上去但沒用到的圖片刪掉
  const uploadsRef = useRef(uploads)
  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])
  useEffect(() => () => uploadsRef.current.clear(true), [])

  /*
    匯率：編輯既有的就沿用它當初的快照，新增則用這趟設定的。
    幣別如果就是結算幣別，匯率一律是 1。
  */
  const rate =
    currency === trip.home_currency
      ? 1
      : isEdit && expense && expense.currency === currency
        ? expense.rate
        : currency === trip.local_currency && trip.fx_rate
          ? trip.fx_rate
          : null

  const numericAmount = parseInput(amount)
  const converted =
    rate !== null && currency !== trip.home_currency
      ? roundTo(numericAmount * rate, trip.home_currency)
      : null

  const canSubmit = numericAmount > 0 && rate !== null && !busy

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    startTransition(async () => {
      const input = {
        title: title.trim() || null,
        category,
        amount: numericAmount,
        currency,
        rate: rate!,
        /*
          日期不另外給欄位 —— 一筆花費算在哪一天，是「算哪一天」那個選擇
          決定的。再放一個日期欄位只會製造出兩者對不起來的狀況。
          這裡直接沿用那一天的日期。
        */
        spent_at: days.find((d) => d.id === dayId)?.date ?? null,
        day_id: dayId,
        activity_id: expense?.activity_id ?? null,
        note: note.trim() || null,
      }

      let expenseId: string
      if (expense) {
        const result = await updateExpense(trip.id, expense.id, input)
        if (!result.ok) {
          toast.error('儲存失敗', { description: result.error })
          return
        }
        expenseId = expense.id
      } else {
        const result = await createExpense(trip.id, input)
        if (!result.ok) {
          toast.error('記帳失敗', { description: result.error })
          return
        }
        expenseId = result.data
      }

      const images = uploads.toCommitInputs(false, 'receipt')
      if (images.length) {
        const imgResult = await commitExpenseImages(trip.id, expenseId, images)
        if (!imgResult.ok) {
          toast.error('圖片沒有存進去', { description: imgResult.error })
        }
      }

      // 先清空清單再關閉，卸載時的清理才不會把剛提交的檔案刪掉
      uploads.clear(false)
      toast.success(isEdit ? '已儲存' : '已記一筆')
      onOpenChange(false)
      router.refresh()
    })
  }

  const symbol = currencyMeta(currency).symbol

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
        {/* ---- 金額 ---- */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="expense-amount">金額</Label>
            <CurrencyRow currency={currency} onChange={setCurrency} trip={trip} />
          </div>

          <div className="relative">
            <span
              className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg"
              aria-hidden
            >
              {symbol}
            </span>
            <Input
              id="expense-amount"
              /*
                inputMode="decimal" 讓手機直接跳出數字鍵盤，但它仍是一般的
                文字輸入 —— type="number" 各家瀏覽器行為不一致，還會多出
                上下箭頭，在手機上只會礙事。
              */
              inputMode="decimal"
              autoFocus={!isEdit}
              value={amount}
              onChange={(e) => setAmount(sanitize(e.target.value, currency))}
              placeholder="0"
              className="h-14 pl-9 text-2xl font-semibold tabular-nums"
            />
          </div>

          {rate === null ? (
            <p className="text-destructive text-xs">
              這個幣別還沒有匯率。到「設定 → 幣別與匯率」設定，或改用{' '}
              {trip.home_currency}。
            </p>
          ) : converted !== null && numericAmount > 0 ? (
            <p className="text-muted-foreground text-right text-sm tabular-nums">
              {formatApprox(converted, trip.home_currency)}
            </p>
          ) : null}
        </div>

        {/* ---- 分類 ---- */}
        <div className="space-y-2">
          <Label>分類</Label>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((c) => {
              const Icon = c.icon
              const active = category === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background font-medium'
                      : 'hover:bg-muted',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ---- 名稱 ---- */}
        <div className="space-y-2">
          <Label htmlFor="expense-title">名稱</Label>
          <Input
            id="expense-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：明洞烤肉（可留空）"
            maxLength={200}
          />
        </div>

        {/* ---- 算哪一天 ---- */}
        <div className="space-y-2">
          <Label htmlFor="expense-day">算哪一天</Label>
          <select
            id="expense-day"
            value={dayId ?? ''}
            onChange={(e) => setDayId(e.target.value || null)}
            className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
          >
            <option value="">未指定</option>
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                Day {d.day_index}
                {d.title ? ` · ${d.title}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ---- 圖片 ---- */}
        <div className="space-y-2">
          <Label>圖片</Label>

          {/*
            已經存好的圖片要在這裡就看得到、也刪得掉。
            原本只寫一行「已有 N 張」，等於把唯一的刪除入口藏在清單的縮圖上 ——
            編輯的時候找不到，就等於刪不掉。
          */}
          {expense?.images.length ? (
            <ExistingImages
              tripId={trip.id}
              images={expense.images}
              disabled={busy}
            />
          ) : null}

          <PendingImagePicker
            items={uploads.items}
            onAdd={uploads.add}
            onRemove={uploads.remove}
            onReorder={uploads.reorder}
            hasExistingCover={false}
            showCoverBadge={false}
          />
        </div>

        {/* ---- 備註 ---- */}
        <div className="space-y-2">
          <Label htmlFor="expense-note">備註</Label>
          <Textarea
            id="expense-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={2000}
          />
        </div>
      </div>

      <div className="pb-safe shrink-0 border-t px-4 py-3">
        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit}
          className="h-12 w-full gap-2 text-base"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {uploads.uploading ? '圖片上傳中…' : isEdit ? '儲存' : '記下來'}
        </Button>
      </div>
    </form>
  )
}

/** 已經存在資料庫裡的圖片：看得到，也刪得掉 */
function ExistingImages({
  tripId,
  images,
  disabled,
}: {
  tripId: string
  images: ImageRow[]
  disabled: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  function remove(image: ImageRow) {
    setRemovingId(image.id)
    startTransition(async () => {
      const result = await deleteImage(tripId, image.id)
      if (!result.ok) {
        setRemovingId(null)
        toast.error('刪除失敗', { description: result.error })
        return
      }
      toast.success('已刪除圖片')
      router.refresh()
    })
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {images.map((image) => {
        const url = getThumbUrl(image)
        const busy = pending && removingId === image.id
        return (
          <li key={image.id} className="relative">
            <span className="bg-muted block size-20 overflow-hidden rounded-lg border">
              {url ? (
                <Image
                  src={url}
                  alt={image.caption ?? ''}
                  width={80}
                  height={80}
                  className={cn(
                    'size-full object-cover transition-opacity',
                    busy && 'opacity-40',
                  )}
                />
              ) : null}
            </span>
            <button
              type="button"
              disabled={disabled || pending}
              onClick={() => remove(image)}
              aria-label="刪除這張圖片"
              className="bg-background absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border shadow-sm disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="size-3.5" aria-hidden />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * 幣別選擇。
 *
 * 常用的兩個（這趟的當地幣別、結算幣別）直接做成按鈕，其餘收在下拉選單裡 ——
 * 一趟旅遊 99% 的花費都落在那兩個。
 */
function CurrencyRow({
  currency,
  onChange,
  trip,
}: {
  currency: string
  onChange: (code: string) => void
  trip: TripRow
}) {
  const quick = [trip.local_currency, trip.home_currency].filter(
    (c, i, arr): c is string => Boolean(c) && arr.indexOf(c) === i,
  )
  const isOther = !quick.includes(currency)

  return (
    <div className="flex items-center gap-1.5">
      {quick.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={currency === code}
          className={cn(
            'h-8 rounded-full border px-2.5 text-xs font-medium transition-colors',
            currency === code
              ? 'border-foreground bg-foreground text-background'
              : 'hover:bg-muted',
          )}
        >
          {code}
        </button>
      ))}
      <select
        value={isOther ? currency : ''}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label="其他幣別"
        className={cn(
          'h-8 rounded-full border px-2 text-xs transition-colors',
          isOther && 'border-foreground bg-foreground text-background',
        )}
      >
        <option value="">其他</option>
        {CURRENCY_LIST.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} {c.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * 只留下數字與一個小數點，並限制小數位數。
 *
 * 韓元、日圓沒有小數，打了小數點也直接濾掉 ——
 * 與其事後跳錯誤訊息，不如一開始就打不出來。
 */
function sanitize(raw: string, currency: string): string {
  const digits = currencyDigits(currency)
  let out = raw.replace(/[^\d.]/g, '')

  // 只保留第一個小數點
  const first = out.indexOf('.')
  if (first !== -1) {
    out = out.slice(0, first + 1) + out.slice(first + 1).replace(/\./g, '')
  }
  if (digits === 0) return out.split('.')[0] ?? ''

  const [int, dec] = out.split('.')
  if (dec === undefined) return out
  return `${int}.${dec.slice(0, digits)}`
}

function parseInput(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** 資料庫存的是 numeric，12.00 要顯示成 "12" 才好接著編輯 */
function stripTrailingZeros(amount: number, code: string): string {
  const digits = currencyMeta(code).digits
  const fixed = amount.toFixed(digits)
  return digits === 0 ? fixed : fixed.replace(/\.?0+$/, '')
}
