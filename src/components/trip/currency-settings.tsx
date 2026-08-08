'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { updateTripCurrency } from '@/actions/owner/expenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CURRENCY_LIST,
  currencyMeta,
  formatInverseRate,
  formatMoney,
} from '@/lib/currency'
import type { TripRow } from '@/lib/supabase/database.types'

/**
 * 幣別與匯率。
 *
 * 匯率是「一趟設一次」的概算，不是即時牌價 —— 記帳當下會把它存成快照，
 * 之後在這裡改不會追溯改到已經記過的帳。
 */
export function CurrencySettings({ trip }: { trip: TripRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [home, setHome] = useState(trip.home_currency)
  const [local, setLocal] = useState(trip.local_currency ?? '')
  const [rate, setRate] = useState(trip.fx_rate ? String(trip.fx_rate) : '')

  const rateValue = Number(rate)
  const rateValid = rate !== '' && Number.isFinite(rateValue) && rateValue > 0
  const needsRate = Boolean(local) && local !== home

  function save() {
    startTransition(async () => {
      const result = await updateTripCurrency(trip.id, {
        home_currency: home,
        local_currency: local || null,
        fx_rate: needsRate && rateValid ? rateValue : null,
      })
      if (!result.ok) {
        toast.error('儲存失敗', { description: result.error })
        return
      }
      toast.success('已儲存幣別設定')
      router.refresh()
    })
  }

  const dirty =
    home !== trip.home_currency ||
    local !== (trip.local_currency ?? '') ||
    rate !== (trip.fx_rate ? String(trip.fx_rate) : '')

  return (
    <div className="space-y-4">
      <fieldset
        disabled={pending}
        className="m-0 min-w-0 space-y-4 border-0 p-0 transition-opacity disabled:opacity-60"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="home-currency">結算幣別</Label>
            <CurrencySelect
              id="home-currency"
              value={home}
              onChange={setHome}
            />
            <p className="text-muted-foreground text-xs">統計換算到這個幣別</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="local-currency">當地幣別</Label>
            <CurrencySelect
              id="local-currency"
              value={local}
              onChange={setLocal}
              allowEmpty
            />
            <p className="text-muted-foreground text-xs">記帳時的預設</p>
          </div>
        </div>

        {needsRate ? (
          <div className="space-y-2">
            <Label htmlFor="fx-rate">匯率</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                1 {local}
              </span>
              <ArrowRight
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
              <Input
                id="fx-rate"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.0234"
                className="max-w-36 tabular-nums"
              />
              <span className="text-muted-foreground shrink-0 text-sm">
                {home}
              </span>
            </div>

            {rateValid ? (
              /*
                反過來寫。上面的欄位問的是「1 KRW 等於多少 TWD」＝ 0.0234，
                但沒有人記得 0.0234；大家記得的是「1 塊台幣大概 43 韓元」。
                用這個角度才檢查得出來匯率有沒有打錯。
              */
              <p className="text-muted-foreground text-xs tabular-nums">
                {formatMoney(1, home)} ≈ {formatInverseRate(rateValue, local)}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                填了才記得了 {local} 的帳
              </p>
            )}
          </div>
        ) : null}
      </fieldset>

      <Button
        onClick={save}
        disabled={pending || !dirty || (needsRate && !rateValid)}
        className="w-full gap-2"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        儲存幣別設定
      </Button>
    </div>
  )
}

function CurrencySelect({
  id,
  value,
  onChange,
  allowEmpty = false,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  allowEmpty?: boolean
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
    >
      {allowEmpty ? <option value="">不設定</option> : null}
      {CURRENCY_LIST.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} {currencyMeta(c.code).symbol} {c.label}
        </option>
      ))}
    </select>
  )
}
