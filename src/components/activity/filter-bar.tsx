'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { X } from 'lucide-react'

import { CATEGORIES, tagColorClass } from '@/lib/constants'
import type { ActivityCategory, TagRow } from '@/lib/supabase/database.types'
import type { ActivityWithRelations } from '@/lib/queries'
import { cn } from '@/lib/utils'

export type ActivityFilters = {
  categories: ActivityCategory[]
  tagIds: string[]
}

/** 從 URL search params 讀出篩選條件 */
export function parseFilters(params: URLSearchParams): ActivityFilters {
  const cats = params.get('cat')?.split(',').filter(Boolean) ?? []
  const valid = new Set(CATEGORIES.map((c) => c.value as string))
  return {
    categories: cats.filter((c) => valid.has(c)) as ActivityCategory[],
    tagIds: params.get('tag')?.split(',').filter(Boolean) ?? [],
  }
}

export function applyFilters(
  activities: ActivityWithRelations[],
  filters: ActivityFilters,
): ActivityWithRelations[] {
  if (!filters.categories.length && !filters.tagIds.length) return activities
  return activities.filter((a) => {
    if (filters.categories.length && !filters.categories.includes(a.category)) {
      return false
    }
    // 標籤採 OR：符合任一個選取的標籤就顯示
    if (
      filters.tagIds.length &&
      !filters.tagIds.some((t) => a.tagIds.includes(t))
    ) {
      return false
    }
    return true
  })
}

/**
 * 篩選列。狀態存在 URL search params，所以切換日期、進出行程詳情、
 * 甚至重新整理之後篩選條件都還在。
 */
export function FilterBar({
  tags,
  /** 只顯示這一天實際出現過的分類，避免一整排用不到的選項 */
  availableCategories,
}: {
  tags: TagRow[]
  availableCategories: Set<ActivityCategory>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  )

  const update = useCallback(
    (key: 'cat' | 'tag', values: string[]) => {
      const next = new URLSearchParams(searchParams.toString())
      if (values.length) next.set(key, values.join(','))
      else next.delete(key)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const toggle = (key: 'cat' | 'tag', current: string[], value: string) => {
    update(
      key,
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    )
  }

  const visibleCategories = CATEGORIES.filter((c) =>
    availableCategories.has(c.value),
  )
  const hasFilters = filters.categories.length > 0 || filters.tagIds.length > 0

  // 分類只有一種時篩選沒有意義
  if (visibleCategories.length <= 1 && tags.length === 0) return null

  return (
    <div className="no-scrollbar overflow-x-auto border-b">
      <div className="flex w-max items-center gap-1.5 px-4 py-2">
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams.toString())
              next.delete('cat')
              next.delete('tag')
              const qs = next.toString()
              router.replace(qs ? `${pathname}?${qs}` : pathname, {
                scroll: false,
              })
            }}
            className="bg-foreground text-background inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium"
          >
            <X className="size-3" aria-hidden />
            清除
          </button>
        ) : null}

        {visibleCategories.length > 1
          ? visibleCategories.map((cat) => {
              const Icon = cat.icon
              const active = filters.categories.includes(cat.value)
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggle('cat', filters.categories, cat.value)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-all',
                    cat.chip,
                    active ? 'ring-foreground/40 ring-2' : 'opacity-55',
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                  {cat.label}
                </button>
              )
            })
          : null}

        {tags.map((tag) => {
          const active = filters.tagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle('tag', filters.tagIds, tag.id)}
              aria-pressed={active}
              className={cn(
                'inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-all',
                tagColorClass(tag.color),
                active ? 'ring-foreground/40 ring-2' : 'opacity-55',
              )}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
