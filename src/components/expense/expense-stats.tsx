'use client'

import { formatApprox, formatMoney } from '@/lib/currency'
import { expenseCategoryMeta } from '@/lib/expense-constants'
import { describeTotal, type ExpenseSummary } from '@/lib/expense-summary'
import type { ExpenseCategory } from '@/lib/supabase/database.types'

/**
 * 花費統計。
 *
 * 圖表刻意手刻 SVG / CSS 而不是引入 recharts 之類的套件：這麼單純的圖
 * 不值得多背 100KB 以上的 JS，而這是手機優先的 App，bundle 大小是有感的。
 *
 * 所有圖表一律用結算幣別。混幣時那是唯一加得起來的單位 ——
 * ₩ 和 NT$ 沒辦法畫在同一根長條上。
 *
 * 這裡不顯示總額：花費分頁上方本來就有，重複一次只是佔掉一屏。
 */

/**
 * 「全部」看到的東西：整趟的形狀。
 *
 * 刻意不列出所有花費 —— 三百筆就是二十幾屏的牆，沒有人會用它找東西，
 * 要看某一天的明細直接點上面的日期。這一頁回答的是「錢花去哪了」。
 */
export function TripOverviewCharts({ summary }: { summary: ExpenseSummary }) {
  if (summary.count === 0) return null

  return (
    <div className="space-y-6">
      {summary.byDay.length > 1 ? (
        <section>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium">
            每天花費
          </h3>
          <DailyBars summary={summary} />
        </section>
      ) : null}

      <section>
        <h3 className="text-muted-foreground mb-2 text-xs font-medium">
          分類佔比
        </h3>
        <CategoryBars summary={summary} />
      </section>
    </div>
  )
}

/** 單日看到的東西：這一天的分類組成。下面接的是那天的明細 */
export function DayCategoryChart({ summary }: { summary: ExpenseSummary }) {
  if (summary.count === 0) return null
  return <CategoryDonut summary={summary} />
}

export function TotalHeader({
  described,
}: {
  described: ReturnType<typeof describeTotal>
}) {
  return (
    <div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">
        {formatMoney(described.primary.amount, described.primary.currency)}
      </p>
      {described.secondary.length ? (
        <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-sm tabular-nums">
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
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              {/*
                寬度用「佔總額的比例」而不是「佔最大值的比例」。
                除以最大值的話，最大的那個分類永遠是滿版 —— 標著 79% 卻畫成
                100%，跟旁邊自己的數字對不起來。
              */}
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(row.ratio * 100, 1.5)}%`,
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

/**
 * 每天花費。
 *
 * 單一顏色。這張圖回答的是「哪一天花比較多」，只有一個變數，
 * 上色只會讓人以為顏色帶有額外意義。分類的組成留給單日的圓餅圖去講。
 * 用 --primary 而不是接近黑的前景色 —— 那個又重又跟整體脫節。
 */
function DailyBars({ summary }: { summary: ExpenseSummary }) {
  const max = Math.max(...summary.byDay.map((d) => d.home), 1)
  const HEIGHT = 92

  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="flex min-w-full items-end gap-2">
        {summary.byDay.map((d) => (
          <div
            key={d.dayId ?? 'none'}
            /* 天數少時不要讓長條變成一整片色塊，所以給上限 */
            className="flex max-w-14 min-w-8 flex-1 flex-col items-center gap-1"
          >
            <span className="text-muted-foreground text-[10px] tabular-nums">
              {compact(d.home)}
            </span>

            <div
              className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
              style={{
                /* 最矮也留 3px，否則金額很小的那天會整根消失 */
                height: `${Math.max((d.home / max) * HEIGHT, 3)}px`,
              }}
              role="img"
              aria-label={`${
                d.dayIndex === null ? '其他' : `Day ${d.dayIndex}`
              }：${formatMoney(d.home, summary.total.homeCurrency)}`}
            >
              <div className="bg-primary size-full" />
            </div>

            <span className="text-muted-foreground border-border w-full border-t pt-1 text-center text-[10px]">
              {d.dayIndex === null ? '其他' : `D${d.dayIndex}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 單日的分類圓餅（甜甜圈）。
 *
 * 用 stroke-dasharray 在同一個圓上疊出每一段，而不是自己算弧線的 path ——
 * 少了一堆三角函數，也不會有浮點誤差造成的縫隙。
 *
 * 中間留空放總額：圓餅圖最常被問的就是「所以總共多少」，
 * 那個洞不放東西才是浪費。
 */
function CategoryDonut({ summary }: { summary: ExpenseSummary }) {
  const R = 42
  const C = 2 * Math.PI * R
  const total = summary.total.home

  /*
    用一般的迴圈累加，不要在 map 的 callback 裡改外面的變數 ——
    那個 callback 會被 React Compiler 當成活過 render 的閉包而報錯。
  */
  const arcs: { category: ExpenseCategory; len: number; offset: number }[] = []
  let cursor = 0
  for (const row of summary.byCategory) {
    const len = total > 0 ? (row.home / total) * C : 0
    arcs.push({ category: row.category, len, offset: cursor })
    cursor += len
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          {/* 只有一個分類時畫不出「一段」，直接畫整個圓 */}
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="14"
            className="stroke-muted"
          />
          {arcs.map((a) => (
            <circle
              key={a.category}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth="14"
              stroke={expenseCategoryMeta(a.category).color}
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </svg>

        {/*
        中間放這一天換算後的總額。
        下面的日期標頭顯示的是原始幣別（₩），兩個互補而不是重複。
      */}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold tabular-nums">
            {formatMoney(total, summary.total.homeCurrency)}
          </span>
        </span>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {summary.byCategory.map((row) => {
          const meta = expenseCategoryMeta(row.category)
          return (
            <li
              key={row.category}
              className="flex items-baseline gap-2 text-sm"
            >
              <span
                className="size-2.5 shrink-0 translate-y-0.5 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{meta.label}</span>
              <span className="tabular-nums">
                {formatMoney(row.home, summary.total.homeCurrency)}
              </span>
              <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                {Math.round(row.ratio * 100)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** 直條圖上方的數字，位數多了會把版面撐爆，所以縮寫 */
function compact(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}
