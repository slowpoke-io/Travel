'use client'

import { usePathname } from 'next/navigation'

import {
  DayPageSkeleton,
  ExpensePageSkeleton,
  MapPageSkeleton,
} from '@/components/trip/skeletons'
import { tripViewFromPathname } from '@/lib/trip-nav'

/**
 * 三個分頁共用一條路由，所以骨架也要自己看網址決定畫哪一種。
 *
 * 這只會在「真的導航」時出現 —— 從外面直接開網址、或從設定頁回來。
 * 分頁之間互相切換不走導航，不會經過這裡。
 */
export default function Loading() {
  const view = tripViewFromPathname(usePathname())
  if (view.tab === 'map') return <MapPageSkeleton />
  if (view.tab === 'expense') return <ExpensePageSkeleton />
  return <DayPageSkeleton />
}
