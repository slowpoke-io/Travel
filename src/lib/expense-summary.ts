import { roundTo, sumMoney } from '@/lib/currency'
import type {
  ExpenseCategory,
  ExpenseRow,
  TripDayRow,
} from '@/lib/supabase/database.types'

/**
 * 一筆總額。
 *
 * 為什麼不是單一數字：一趟旅遊可能同時有 ₩（當地花的）和 NT$（出發前刷的機票），
 * 這兩個沒有共同單位，只有換算到結算幣別才加得起來。但顯示時使用者想看的是
 * 原始幣別，所以兩種都留著，由 UI 決定怎麼呈現。
 */
export type MoneyTotal = {
  /** 換算成結算幣別的總額。混幣時唯一加得起來的數字 */
  home: number
  homeCurrency: string
  /** 各原始幣別的小計，金額大到小 */
  byCurrency: { currency: string; amount: number }[]
}

export type ExpenseSummary = {
  total: MoneyTotal
  /** 依分類，金額大到小。ratio 是佔總額的比例（0–1） */
  byCategory: {
    category: ExpenseCategory
    home: number
    ratio: number
  }[]
  /** 依天，照 day_index 排序；最後一筆可能是沒有指定天數的「其他」 */
  byDay: {
    dayId: string | null
    dayIndex: number | null
    date: string | null
    home: number
    count: number
  }[]
  count: number
}

function buildTotal(rows: ExpenseRow[], homeCurrency: string): MoneyTotal {
  const perCurrency = new Map<string, number[]>()
  for (const row of rows) {
    const list = perCurrency.get(row.currency)
    if (list) list.push(row.amount)
    else perCurrency.set(row.currency, [row.amount])
  }

  const byCurrency = [...perCurrency]
    .map(([currency, amounts]) => ({
      currency,
      amount: sumMoney(amounts, currency),
    }))
    .sort((a, b) => b.amount - a.amount)

  return {
    home: sumMoney(
      rows.map((r) => r.amount_home),
      homeCurrency,
    ),
    homeCurrency,
    byCurrency,
  }
}

export function buildExpenseSummary(
  expenses: ExpenseRow[],
  days: TripDayRow[],
  homeCurrency: string,
): ExpenseSummary {
  const total = buildTotal(expenses, homeCurrency)

  // ---- 分類 ----
  const perCategory = new Map<ExpenseCategory, number[]>()
  for (const e of expenses) {
    const list = perCategory.get(e.category)
    if (list) list.push(e.amount_home)
    else perCategory.set(e.category, [e.amount_home])
  }
  const byCategory = [...perCategory]
    .map(([category, amounts]) => {
      const home = sumMoney(amounts, homeCurrency)
      return {
        category,
        home,
        // 總額是 0 時（全部都是 0 元）比例一律給 0，不要除以零
        ratio: total.home > 0 ? home / total.home : 0,
      }
    })
    .sort((a, b) => b.home - a.home)

  // ---- 每天 ----
  const perDay = new Map<string | null, ExpenseRow[]>()
  for (const e of expenses) {
    const list = perDay.get(e.day_id)
    if (list) list.push(e)
    else perDay.set(e.day_id, [e])
  }

  const dayById = new Map(days.map((d) => [d.id, d] as const))
  const byDay = [...perDay]
    .map(([dayId, rows]) => {
      const day = dayId ? dayById.get(dayId) : undefined
      return {
        dayId,
        dayIndex: day?.day_index ?? null,
        date: day?.date ?? null,
        home: sumMoney(
          rows.map((r) => r.amount_home),
          homeCurrency,
        ),
        count: rows.length,
      }
    })
    .sort((a, b) => {
      // 沒有指定天數的排到最後
      if (a.dayIndex === null) return 1
      if (b.dayIndex === null) return -1
      return a.dayIndex - b.dayIndex
    })

  return { total, byCategory, byDay, count: expenses.length }
}

/**
 * 決定一筆總額要怎麼顯示。
 *
 * 規則（依照「原始幣別是主角、結算幣別是括號裡的補充」）：
 *   - 只有一種幣別，而且就是結算幣別 → 只顯示它，沒有補充
 *   - 只有一種幣別，不是結算幣別     → 主：原始幣別；補充：≈結算幣別
 *   - 混了多種幣別                   → 主：結算幣別（唯一加得起來的）；
 *                                      補充：各幣別小計
 */
export function describeTotal(total: MoneyTotal): {
  primary: { amount: number; currency: string }
  /** 補充顯示。混幣時會有多筆 */
  secondary: { amount: number; currency: string; approx: boolean }[]
} {
  const only = total.byCurrency.length === 1 ? total.byCurrency[0] : null

  if (only && only.currency === total.homeCurrency) {
    return { primary: { amount: only.amount, currency: only.currency }, secondary: [] }
  }

  if (only) {
    return {
      primary: { amount: only.amount, currency: only.currency },
      secondary: [
        { amount: total.home, currency: total.homeCurrency, approx: true },
      ],
    }
  }

  return {
    primary: { amount: total.home, currency: total.homeCurrency },
    secondary: total.byCurrency.map((c) => ({
      amount: c.amount,
      currency: c.currency,
      approx: false,
    })),
  }
}

/** 單筆花費的換算補充。已經是結算幣別時不需要補充 */
export function convertedHome(
  expense: ExpenseRow,
  homeCurrency: string,
): number | null {
  if (expense.currency === homeCurrency) return null
  return roundTo(expense.amount_home, homeCurrency)
}
