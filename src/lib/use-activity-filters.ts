'use client'

import { useCallback, useState } from 'react'

import {
  EMPTY_FILTERS,
  type ActivityFilters,
} from '@/lib/activity-filters'
import type { ActivityCategory } from '@/lib/supabase/database.types'

/**
 * 篩選條件。
 *
 * 狀態放在 client，網址只是同步過去的副本 —— 用 history.replaceState 而不是
 * router.replace。原本走 router.replace 的話，每點一次 chip 都會讓整頁在
 * 伺服器重新渲染一次；但篩選本身只是對手邊的陣列做 filter，根本不需要
 * 問伺服器任何事。網址仍然可以分享、重新整理後條件也還在。
 */
export function useActivityFilters(initial?: ActivityFilters) {
  /*
    初始值由 server 傳入（page 讀 searchParams），這樣帶著篩選參數的深連結
    在伺服器端就已經是過濾後的結果，不會先閃一下未過濾的完整清單。
  */
  const [filters, setFilters] = useState<ActivityFilters>(initial ?? EMPTY_FILTERS)

  const apply = useCallback((next: ActivityFilters) => {
    setFilters(next)

    const params = new URLSearchParams(window.location.search)
    if (next.categories.length) params.set('cat', next.categories.join(','))
    else params.delete('cat')
    if (next.tagIds.length) params.set('tag', next.tagIds.join(','))
    else params.delete('tag')

    const qs = params.toString()
    window.history.replaceState(
      null,
      '',
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    )
  }, [])

  const toggleCategory = useCallback(
    (value: ActivityCategory) => {
      apply({
        ...filters,
        categories: filters.categories.includes(value)
          ? filters.categories.filter((c) => c !== value)
          : [...filters.categories, value],
      })
    },
    [filters, apply],
  )

  const toggleTag = useCallback(
    (id: string) => {
      apply({
        ...filters,
        tagIds: filters.tagIds.includes(id)
          ? filters.tagIds.filter((t) => t !== id)
          : [...filters.tagIds, id],
      })
    },
    [filters, apply],
  )

  const clear = useCallback(() => apply(EMPTY_FILTERS), [apply])

  const active = filters.categories.length > 0 || filters.tagIds.length > 0

  return { filters, toggleCategory, toggleTag, clear, active }
}
