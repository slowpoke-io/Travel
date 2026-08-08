import {
  Bed,
  Camera,
  MapPin,
  ShoppingBag,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

import type { ActivityCategory } from '@/lib/supabase/database.types'

export type CategoryMeta = {
  value: ActivityCategory
  label: string
  icon: LucideIcon
  /**
   * 這個分類的顏色，寫成 CSS 變數而不是色碼。
   *
   * 這樣同一個值可以直接放進 inline style、Leaflet 的 divIcon、以及 SVG 圖表，
   * 而且會跟著主題與深淺模式一起變。色塊底色一律由它 color-mix 出來，
   * 不再各自維護一組 Tailwind class。
   */
  color: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    value: 'sight',
    label: '景點',
    icon: Camera,
    color: 'var(--color-cat-sight)',
  },
  {
    value: 'food',
    label: '餐飲',
    icon: UtensilsCrossed,
    color: 'var(--color-cat-food)',
  },
  {
    value: 'lodging',
    label: '住宿',
    icon: Bed,
    color: 'var(--color-cat-lodging)',
  },
  {
    value: 'transport',
    label: '交通',
    icon: TrainFront,
    color: 'var(--color-cat-transport)',
  },
  {
    value: 'shopping',
    label: '購物',
    icon: ShoppingBag,
    color: 'var(--color-cat-shopping)',
  },
  {
    value: 'other',
    label: '其他',
    icon: MapPin,
    color: 'var(--color-cat-other)',
  },
]

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.value, c]))

export function categoryMeta(value: ActivityCategory): CategoryMeta {
  return CATEGORY_MAP.get(value) ?? CATEGORIES[CATEGORIES.length - 1]
}

/** 使用者自訂標籤可選的顏色 */
export const TAG_COLORS = [
  'slate',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'sky',
  'indigo',
  'violet',
  'pink',
] as const

export type TagColor = (typeof TAG_COLORS)[number]

const TAG_COLOR_CLASSES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
  orange:
    'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  green: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-200',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200',
  indigo:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
  violet:
    'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-200',
}

export function tagColorClass(color: string): string {
  return TAG_COLOR_CLASSES[color] ?? TAG_COLOR_CLASSES.slate
}

/**
 * 分類色塊的底色。
 *
 * 用 color-mix 從同一個分類色調出來，深淺模式各自吃得到對的底 ——
 * 原本每個分類都要手寫 `bg-orange-100 dark:bg-orange-950` 兩組 class，
 * 換主題時完全跟不上。
 */
export function categoryChipStyle(color: string) {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
    color,
  }
}

/**
 * 每一天在「全程地圖」上的顏色。
 *
 * 值是 CSS 變數，實際的明度與彩度由主題決定（見 globals.css）——
 * 原本是一排寫死的飽和色碼，在深色主題下會刺眼。
 */
export const DAY_COLORS = [
  'var(--day-1)',
  'var(--day-2)',
  'var(--day-3)',
  'var(--day-4)',
  'var(--day-5)',
  'var(--day-6)',
  'var(--day-7)',
  'var(--day-8)',
]

export function dayColor(dayIndex: number): string {
  return DAY_COLORS[(dayIndex - 1) % DAY_COLORS.length]
}

export const STORAGE_BUCKET = 'trip-media'
