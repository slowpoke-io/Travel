'use client'

import { formatApprox, formatMoney } from '@/lib/currency'
import { expenseCategoryMeta } from '@/lib/expense-constants'
import { describeTotal, type ExpenseSummary } from '@/lib/expense-summary'

/**
 * 花費統計。
 *
 * 圖表刻意手刻 SVG / CSS 而不是引入 recharts 之類的套件：這麼單純的兩張圖
 * 不值得多背 100KB 以上的 JS，而這是手機優先的 App，bundle 大小是有感的。
 *
 * 所有圖表一律用結算幣別。混幣時那是唯一加得起來的單位 ——
 * ₩ 和 NT$ 沒辦法畫在同一根長條上。
 *
 * 這裡不再顯示一次總額：花費分頁上方本來就有，重複一次只是佔掉一屏。
 */
export function ExpenseStats({ summary }: { summary: ExpenseSummary }) {
  if (summary.count === 0) return null

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-muted-foreground mb-2 text-xs font-medium">
          分類佔比
        </h3>
        <CategoryBars summary={summary} />
      </section>

      {summary.byDay.length > 1 ? (
        <section>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium">
            每天花費
          </h3>
          <DailyBars summary={summary} />
        </section>
      ) : null}
    </div>
  )
}

export function TotalHeader({
  described,
}: {
  described: ReturnType<typeof describeTotal>
}) {
  return (
    <div>
      <p className="font-numeric text-3xl font-semibold tracking-tight tabular-nums">
        {formatMoney(described.primary.amount, described.primary.currency)}
      </p>
      {described.secondary.length ? (
        <p className="text-muted-foreground font-numeric mt-0.5 flex flex-wrap gap-x-3 text-sm tabular-nums">
          {described.secondary.map((s) => (
            <span key={s.currency}>
              {s.approx
                ? formatApprox(s.amount, s.currency)
                : formatMoney(s.amount, s.currency)}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}

/**
 * 分類佔比用橫向長條而不是圓餅圖。
 *
 * 手機寬度下圓餅圖的標籤根本放不下，只能另外做圖例，讀的人要在兩邊來回對照。
 * 橫條可以把名稱、金額、比例排在同一行，一眼掃完。
 */
function CategoryBars({ summary }: { summary: ExpenseSummary }) {
  const max = Math.max(...summary.byCategory.map((c) => c.home), 1)

  return (
    <ul className="space-y-2.5">
      {summary.byCategory.map((row) => {
        const meta = expenseCategoryMeta(row.category)
        const Icon = meta.icon
        return (
          <li key={row.category}>
            <div className="mb-1 flex items-baseline gap-2 text-sm">
              <Icon
                className="size-4 shrink-0 translate-y-0.5"
                style={{ color: meta.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{meta.label}</span>
              <span className="tabular-nums">
                {formatMoney(row.home, summary.total.homeCurrency)}
              </span>
              <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                {Math.round(row.ratio * 100)}%
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(row.home / max) * 100}%`,
                  backgroundColor: meta.color,
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function DailyBars({ summary }: { summary: ExpenseSummary }) {
  const max = Math.max(...summary.byDay.map((d) => d.home), 1)

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
      {summary.byDay.map((d) => (
        <div
          key={d.dayId ?? 'none'}
          className="flex min-w-9 flex-1 flex-col items-center gap-1"
        >
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {compact(d.home)}
          </span>
          <div
            className="bg-foreground/80 w-full rounded-t"
            style={{
              /* 最矮也留 3px，否則金額很小的那天會整根消失 */
              height: `${Math.max((d.home / max) * 96, 3)}px`,
            }}
          />
          <span className="text-muted-foreground text-[10px]">
            {d.dayIndex === null ? '其他' : `D${d.dayIndex}`}
          </span>
        </div>
      ))}
    </div>
  )
}

/** 直條圖上方的數字，位數多了會把版面撐爆，所以縮寫 */
function compact(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}
