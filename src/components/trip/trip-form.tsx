'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { CalendarDays, Loader2 } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { PendingImagePicker } from '@/components/image/pending-image-picker'
import type { PendingUpload } from '@/lib/use-pending-uploads'
import type { ActionResult } from '@/lib/action-result'
import type { TripInput } from '@/lib/schemas'
import { uploadTripCover } from '@/lib/upload-trip-cover'

type Props = {
  mode: 'create' | 'edit'
  initial?: Partial<TripInput>
  /** 回傳 trip id（create）或 undefined（edit） */
  action: (input: TripInput) => Promise<ActionResult<string> | ActionResult>
  onSaved?: (tripId?: string) => void
  submitLabel?: string
  /** 編輯模式下，改日期會增減天數，需要提醒使用者 */
  dayCountHint?: number
}

function toDate(value: string | null | undefined): Date | undefined {
  return value ? parseISO(value) : undefined
}

function toIso(date: Date | undefined): string | null {
  return date ? format(date, 'yyyy-MM-dd') : null
}

export function TripForm({
  mode,
  initial,
  action,
  onSaved,
  submitLabel,
  dayCountHint,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = toDate(initial?.start_date)
    const to = toDate(initial?.end_date)
    return from ? { from, to } : undefined
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  /*
    建立旅遊時 tripId 還不存在，Storage 的路徑要以它開頭，所以沒辦法
    像行程那樣先傳。這裡只留住檔案，等旅遊建立完成才上傳。
  */
  const [cover, setCover] = useState<PendingUpload[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)

  const nights =
    range?.from && range?.to
      ? Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1
      : range?.from
        ? 1
        : 0

  const dayCountChanged =
    mode === 'edit' && dayCountHint !== undefined && nights > 0
      ? nights !== dayCountHint
      : false

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('請輸入旅遊名稱')
      return
    }

    startTransition(async () => {
      const result = await action({
        title: title.trim(),
        destination: destination.trim() || null,
        summary: summary.trim() || null,
        start_date: toIso(range?.from),
        end_date: toIso(range?.to ?? range?.from),
        timezone: 'Asia/Taipei',
      })

      if (!result.ok) {
        toast.error(mode === 'create' ? '建立失敗' : '儲存失敗', {
          description: result.error,
        })
        return
      }

      const newId = typeof result.data === 'string' ? result.data : undefined

      // 封面要等旅遊存在之後才能上傳（images 的外鍵指向 trip）
      if (newId && coverFile) {
        setUploadingCover(true)
        await uploadTripCover(newId, coverFile)
        setUploadingCover(false)
      }

      toast.success(mode === 'create' ? '旅遊已建立' : '已儲存')
      if (onSaved) onSaved(newId)
      else if (newId) router.push(`/trips/${newId}`)
      else router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/*
        送出中把所有欄位一起鎖住。用 fieldset 的原生 disabled 而不是逐個
        傳 disabled —— 少一堆重複，而且日後加欄位時不會忘記。
        原本 form 上的 space-y-6 搬到這裡，版面不變。
      */}
      <fieldset
        disabled={pending}
        className="m-0 min-w-0 space-y-6 border-0 p-0 transition-opacity disabled:opacity-60"
      >
        <div className="space-y-2">
          <Label htmlFor="trip-title">旅遊名稱</Label>
          <Input
            id="trip-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：東京五日自由行"
            maxLength={120}
            autoFocus={mode === 'create'}
            required
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trip-destination">目的地</Label>
          <Input
            id="trip-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="例：東京"
            maxLength={120}
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label>旅遊日期</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full justify-start gap-2 text-left text-base font-normal"
              >
                <CalendarDays className="size-4 shrink-0" aria-hidden />
                {range?.from ? (
                  <span>
                    {format(range.from, 'yyyy/MM/dd')}
                    {range.to ? ` – ${format(range.to, 'MM/dd')}` : ''}
                    <span className="text-muted-foreground ml-2 text-sm">
                      {nights} 天
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">選擇日期區間</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                locale={zhTW}
                defaultMonth={range?.from}
              />
              <div className="flex justify-between border-t p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRange(undefined)}
                >
                  清除
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCalendarOpen(false)}
                >
                  完成
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {dayCountChanged ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              天數會從 {dayCountHint} 天變成 {nights} 天。
              {nights < (dayCountHint ?? 0)
                ? '被移除那幾天的行程會退回儲備區，不會消失。'
                : ''}
            </p>
          ) : null}
        </div>

        {mode === 'create' ? (
          <div className="space-y-2">
            <Label>封面圖片</Label>
            <PendingImagePicker
              items={cover}
              onAdd={(files) => {
                const file = files[0]
                if (!file) return
                for (const c of cover) URL.revokeObjectURL(c.previewUrl)
                setCoverFile(file)
                setCover([
                  {
                    id: crypto.randomUUID(),
                    previewUrl: URL.createObjectURL(file),
                    status: 'done',
                    progress: 100,
                  },
                ])
              }}
              onRemove={() => {
                for (const c of cover) URL.revokeObjectURL(c.previewUrl)
                setCover([])
                setCoverFile(null)
              }}
              onReorder={setCover}
              hasExistingCover={false}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="trip-summary">備註</Label>
          <Textarea
            id="trip-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="航班資訊、同行者、預算…"
            rows={3}
            maxLength={2000}
            className="text-base"
          />
        </div>
      </fieldset>

      <Button
        type="submit"
        size="lg"
        disabled={pending || uploadingCover}
        className="h-12 w-full text-base"
      >
        {pending || uploadingCover ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {uploadingCover
          ? '上傳封面…'
          : (submitLabel ?? (mode === 'create' ? '建立旅遊' : '儲存'))}
      </Button>
    </form>
  )
}
