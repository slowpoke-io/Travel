'use client'

import Image from 'next/image'
import { MoreVertical, Paperclip } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatApprox, formatMoney } from '@/lib/currency'
import { expenseCategoryMeta } from '@/lib/expense-constants'
import { convertedHome } from '@/lib/expense-summary'
import { getThumbUrl } from '@/lib/image-url'
import type { ExpenseWithImages } from '@/lib/queries'
import { cn } from '@/lib/utils'

/**
 * 一筆花費。
 *
 * 金額用原始幣別當主角、結算幣別放在下面當補充 —— 你在店裡看到的是 ₩12,000，
 * 帳目上也應該先看到那個數字。
 */
export function ExpenseCard({
  expense,
  homeCurrency,
  canEdit,
  removing = false,
  onEdit,
  onDelete,
  onOpenImages,
}: {
  expense: ExpenseWithImages
  homeCurrency: string
  canEdit: boolean
  removing?: boolean
  onEdit: () => void
  onDelete: () => void
  onOpenImages: () => void
}) {
  const meta = expenseCategoryMeta(expense.category)
  const Icon = meta.icon
  const home = convertedHome(expense, homeCurrency)
  const firstImage = expense.images[0]
  const thumbUrl = firstImage ? getThumbUrl(firstImage) : null

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-opacity',
        removing && 'opacity-50',
      )}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {expense.title || meta.label}
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {expense.title ? <span>{meta.label}</span> : null}
          {expense.note ? (
            <span className="truncate">· {expense.note}</span>
          ) : null}
        </span>
      </span>

      {thumbUrl ? (
        <button
          type="button"
          onClick={onOpenImages}
          aria-label="看圖片"
          className="relative size-9 shrink-0 overflow-hidden rounded-md border"
        >
          <Image
            src={thumbUrl}
            alt=""
            fill
            sizes="36px"
            className="object-cover"
          />
        </button>
      ) : null}

      <span className="shrink-0 text-right tabular-nums">
        <span className="block text-sm font-semibold">
          {formatMoney(expense.amount, expense.currency)}
        </span>
        {home !== null ? (
          <span className="text-muted-foreground block text-[11px]">
            {formatApprox(home, homeCurrency)}
          </span>
        ) : null}
      </span>

      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="更多操作"
              className="-mr-2 size-8 shrink-0"
            >
              <MoreVertical className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>編輯</DropdownMenuItem>
            {expense.images.length ? (
              <DropdownMenuItem onSelect={onOpenImages}>
                <Paperclip className="size-4" aria-hidden />
                圖片（{expense.images.length}）
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
