'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { createTag, deleteTag } from '@/actions/owner/activities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { tagColorClass, TAG_COLORS } from '@/lib/constants'
import type { TagRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

export function TagManager({
  tripId,
  tags,
}: {
  tripId: string
  tags: TagRow[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(TAG_COLORS[0])
  const [pending, startTransition] = useTransition()

  function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await createTag(tripId, trimmed, color)
      if (!result.ok) {
        toast.error('新增標籤失敗', { description: result.error })
        return
      }
      setName('')
      setColor(TAG_COLORS[(tags.length + 1) % TAG_COLORS.length])
      router.refresh()
    })
  }

  function remove(tag: TagRow) {
    startTransition(async () => {
      const result = await deleteTag(tripId, tag.id)
      if (!result.ok) {
        toast.error('刪除失敗', { description: result.error })
        return
      }
      toast.success(`已刪除標籤「${tag.name}」`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {tags.length === 0 ? null : (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag.id}>
              <span
                className={cn(
                  'inline-flex h-8 items-center gap-1 rounded-full pr-1 pl-3 text-xs font-medium',
                  tagColorClass(tag.color),
                )}
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  disabled={pending}
                  aria-label={`刪除標籤 ${tag.name}`}
                  className="flex size-6 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <div className="flex shrink-0 gap-1">
          {TAG_COLORS.slice(0, 5).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`選擇顏色 ${c}`}
              aria-pressed={color === c}
              className={cn(
                'size-9 rounded-md transition-all',
                tagColorClass(c),
                color === c && 'ring-foreground/40 ring-2',
              )}
            />
          ))}
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="新標籤名稱"
          maxLength={24}
          className="h-9"
        />
        <Button
          type="button"
          size="sm"
          onClick={add}
          disabled={pending || !name.trim()}
          className="h-9 shrink-0"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
        </Button>
      </div>
    </div>
  )
}
