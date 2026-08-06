'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { tagColorClass, TAG_COLORS } from '@/lib/constants'
import type { TagRow } from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'
import { cn } from '@/lib/utils'

/**
 * 自訂標籤選擇器：可勾選既有標籤，也能直接新增。
 * 新標籤的顏色從色盤中依既有數量輪流指派，使用者不用每次都挑顏色。
 */
export function TagPicker({
  tags,
  selected,
  onChange,
  onTagCreated,
}: {
  tags: TagRow[]
  selected: string[]
  onChange: (ids: string[]) => void
  onTagCreated?: (tag: { id: string; name: string; color: string }) => void
}) {
  const mutations = useTripMutations()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [pending, startTransition] = useTransition()

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((t) => t !== id)
        : [...selected, id],
    )
  }

  function create() {
    const trimmed = name.trim()
    if (!trimmed) return

    const existing = tags.find((t) => t.name === trimmed)
    if (existing) {
      if (!selected.includes(existing.id)) toggle(existing.id)
      setName('')
      setAdding(false)
      return
    }

    startTransition(async () => {
      const color = TAG_COLORS[tags.length % TAG_COLORS.length]
      const result = await mutations.createTag(trimmed, color)
      if (!result.ok) {
        toast.error('新增標籤失敗', { description: result.error })
        return
      }
      onTagCreated?.(result.data)
      onChange([...selected, result.data.id])
      setName('')
      setAdding(false)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const active = selected.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              aria-pressed={active}
              className={cn(
                'inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition-all',
                tagColorClass(tag.color),
                active
                  ? 'ring-foreground/40 ring-2'
                  : 'opacity-60 hover:opacity-100',
              )}
            >
              {active ? <Check className="size-3" aria-hidden /> : null}
              {tag.name}
            </button>
          )
        })}

        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-muted-foreground hover:text-foreground inline-flex h-8 items-center gap-1 rounded-full border border-dashed px-3 text-xs"
          >
            <Plus className="size-3" aria-hidden />
            新增標籤
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                create()
              }
              if (e.key === 'Escape') setAdding(false)
            }}
            placeholder="標籤名稱"
            maxLength={24}
            autoFocus
            className="h-9"
          />
          <Button
            type="button"
            size="sm"
            onClick={create}
            disabled={pending || !name.trim()}
            className="h-9"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              '加入'
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setAdding(false)
              setName('')
            }}
            className="h-9"
          >
            取消
          </Button>
        </div>
      ) : null}
    </div>
  )
}
