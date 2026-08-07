import { CATEGORIES } from '@/lib/constants'
import type { ActivityCategory } from '@/lib/supabase/database.types'

export type ActivityFilters = {
  categories: ActivityCategory[]
  tagIds: string[]
}

export const EMPTY_FILTERS: ActivityFilters = { categories: [], tagIds: [] }

/**
 * 把網址參數解析成篩選條件。
 *
 * 這個檔案刻意「不是」client component —— server component 需要在 SSR 時
 * 就套用篩選（帶著參數的深連結才不會先閃一下完整清單），而 'use client'
 * 檔案裡的函式沒辦法從 server 端呼叫。
 */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): ActivityFilters {
  const get = (k: string) => {
    const v = params[k]
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined
  }
  const valid = new Set<string>(CATEGORIES.map((c) => c.value))
  return {
    categories: (get('cat')?.split(',').filter(Boolean) ?? []).filter((c) =>
      valid.has(c),
    ) as ActivityCategory[],
    tagIds: get('tag')?.split(',').filter(Boolean) ?? [],
  }
}
