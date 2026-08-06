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
  /** 卡片色塊 / 地圖標記用的 Tailwind class */
  chip: string
  marker: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    value: 'sight',
    label: '景點',
    icon: Camera,
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    marker: '#0284c7',
  },
  {
    value: 'food',
    label: '餐飲',
    icon: UtensilsCrossed,
    chip: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
    marker: '#ea580c',
  },
  {
    value: 'lodging',
    label: '住宿',
    icon: Bed,
    chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    marker: '#7c3aed',
  },
  {
    value: 'transport',
    label: '交通',
    icon: TrainFront,
    chip: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    marker: '#475569',
  },
  {
    value: 'shopping',
    label: '購物',
    icon: ShoppingBag,
    chip: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200',
    marker: '#db2777',
  },
  {
    value: 'other',
    label: '其他',
    icon: MapPin,
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    marker: '#059669',
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

/** 每一天在「全程地圖」上的顏色 */
export const DAY_COLORS = [
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
]

export function dayColor(dayIndex: number): string {
  return DAY_COLORS[(dayIndex - 1) % DAY_COLORS.length]
}

export const STORAGE_BUCKET = 'trip-media'
