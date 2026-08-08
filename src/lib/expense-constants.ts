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
  /** CSS 變數。inline style、SVG 圖表、地圖標記都吃得下，而且跟著主題走 */
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
    color: 'var(--color-cat-food)',
  },
  {
    value: 'transport',
    label: '交通',
    icon: TrainFront,
    color: 'var(--color-cat-transport)',
  },
  {
    value: 'ticket',
    label: '門票',
    icon: Ticket,
    color: 'var(--color-cat-ticket)',
  },
  {
    value: 'shopping',
    label: '購物',
    icon: ShoppingBag,
    color: 'var(--color-cat-shopping)',
  },
  {
    value: 'lodging',
    label: '住宿',
    icon: Bed,
    color: 'var(--color-cat-lodging)',
  },
  {
    value: 'telecom',
    label: '通訊',
    icon: Smartphone,
    color: 'var(--color-cat-telecom)',
  },
  {
    value: 'other',
    label: '其他',
    icon: MoreHorizontal,
    color: 'var(--color-cat-other)',
  },
]

const BY_VALUE = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c] as const))

export function expenseCategoryMeta(value: ExpenseCategory): ExpenseCategoryMeta {
  return BY_VALUE.get(value) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]!
}
