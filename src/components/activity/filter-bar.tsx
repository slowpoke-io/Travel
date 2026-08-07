'use client'

import { X } from 'lucide-react'

import { CATEGORIES, tagColorClass } from '@/lib/constants'
import type { ActivityWithRelations } from '@/lib/queries'
import type { ActivityCategory, TagRow } from '@/lib/supabase/database.types'
import type { ActivityFilters } from '@/lib/activity-filters'
import { cn } from '@/lib/utils'

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
 * 篩選列。
 *
 * 純受控元件 —— 狀態由 useActivityFilters 持有，切換是即時的 client 運算，
 * 不做任何導航。
 */
export function FilterBar({
  tags,
  /** 只顯示這一天實際出現過的分類，避免一整排用不到的選項 */
  availableCategories,
  filters,
  onToggleCategory,
  onToggleTag,
  onClear,
  active,
}: {
  tags: TagRow[]
  availableCategories: Set<ActivityCategory>
  filters: ActivityFilters
  onToggleCategory: (value: ActivityCategory) => void
  onToggleTag: (id: string) => void
  onClear: () => void
  active: boolean
}) {
  const visibleCategories = CATEGORIES.filter((c) =>
    availableCategories.has(c.value),
  )

  // 分類只有一種時篩選沒有意義
  if (visibleCategories.length <= 1 && tags.length === 0) return null

  return (
    <div className="no-scrollbar overflow-x-auto border-b">
      <div className="flex w-max items-center gap-1.5 px-4 py-2">
        {active ? (
          <button
            type="button"
            onClick={onClear}
            className="bg-foreground text-background inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium"
          >
            <X className="size-3" aria-hidden />
            清除
          </button>
        ) : null}

        {visibleCategories.length > 1
          ? visibleCategories.map((cat) => {
              const Icon = cat.icon
              const on = filters.categories.includes(cat.value)
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => onToggleCategory(cat.value)}
                  aria-pressed={on}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-all',
                    cat.chip,
                    on ? 'ring-foreground/40 ring-2' : 'opacity-55',
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                  {cat.label}
                </button>
              )
            })
          : null}

        {tags.map((tag) => {
          const on = filters.tagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggleTag(tag.id)}
              aria-pressed={on}
              className={cn(
                'inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-all',
                tagColorClass(tag.color),
                on ? 'ring-foreground/40 ring-2' : 'opacity-55',
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
