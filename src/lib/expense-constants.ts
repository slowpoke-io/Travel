import {
  Bed,
  MoreHorizontal,
  ShoppingBag,
  Smartphone,
  Ticket,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

import type { ExpenseCategory } from '@/lib/supabase/database.types'

export type ExpenseCategoryMeta = {
  value: ExpenseCategory
  label: string
  icon: LucideIcon
  chip: string
  /** 圖表的顏色。用固定色碼而不是 Tailwind class —— SVG 要的是實際顏色 */
  color: string
}

/**
 * 花費分類。
 *
 * 跟行程分類重疊的幾個（餐飲、住宿、交通、購物）刻意沿用同一組顏色與圖示，
 * 這樣兩邊看起來是同一個系統，只是回答不同的問題。
 */
export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  {
    value: 'food',
    label: '餐飲',
    icon: UtensilsCrossed,
    chip: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
    color: '#ea580c',
  },
  {
    value: 'transport',
    label: '交通',
    icon: TrainFront,
    chip: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    color: '#475569',
  },
  {
    value: 'ticket',
    label: '門票',
    icon: Ticket,
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    color: '#0284c7',
  },
  {
    value: 'shopping',
    label: '購物',
    icon: ShoppingBag,
    chip: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200',
    color: '#db2777',
  },
  {
    value: 'lodging',
    label: '住宿',
    icon: Bed,
    chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    color: '#7c3aed',
  },
  {
    value: 'telecom',
    label: '通訊',
    icon: Smartphone,
    chip: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
    color: '#0d9488',
  },
  {
    value: 'other',
    label: '其他',
    icon: MoreHorizontal,
    chip: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200',
    color: '#78716c',
  },
]

const BY_VALUE = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c] as const))

export function expenseCategoryMeta(value: ExpenseCategory): ExpenseCategoryMeta {
  return BY_VALUE.get(value) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]!
}
