'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 確認對話框。
 *
 * 為什麼要有這個共用元件：確認框蓋在頁面上，如果進度只顯示在底下的頁面
 * （例如卡片上的轉圈），使用者按下「刪除」之後看到的是「什麼都沒發生」——
 * 於是重複點擊。等待狀態必須顯示在對話框「自己」身上。
 *
 * 這裡統一處理：
 *   - 轉圈顯示在動作按鈕上
 *   - 執行中兩顆按鈕都停用，也擋掉點外面／Esc 關閉
 *   - 完成前對話框不會關閉
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '確認',
  cancelLabel = '取消',
  destructive = false,
  disabled = false,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  /** 條件未滿足時停用確認鈕（例如要求輸入名稱確認） */
  disabled?: boolean
  /** 回傳 true 代表成功，對話框才會關閉 */
  onConfirm: () => Promise<boolean | void>
  /** 額外的內容，例如確認用的輸入框 */
  children?: React.ReactNode
}) {
  /*
    一定要用 useTransition 而不是自己的 boolean。

    Server Action 內的 revalidatePath 會讓 Next 重新渲染畫面，而那次更新是
    掛在呼叫它的 transition 上的。在 transition 外面呼叫，重新渲染就不會被
    套用 —— 資料真的改了，畫面卻停在原地。

    順帶的好處：isPending 會一路 true 到新畫面真的 commit，所以轉圈是轉到
    「東西真的消失了」為止，而不是伺服器一回應就停。
  */
  const [pending, startTransition] = useTransition()

  function run() {
    if (pending) return
    startTransition(async () => {
      const result = await onConfirm()
      if (result !== false) onOpenChange(false)
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // 執行中不讓它關掉，否則使用者會以為取消了但其實還在跑
        if (pending) return
        onOpenChange(next)
      }}
    >
      {/* 攔在 onOpenChange 就夠了 —— Esc、點外面、取消鈕最後都會走到那裡 */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        {/* 送出中不讓再改（例如刪除旅遊的名稱確認輸入框） */}
        {children ? (
          <div
            inert={pending || undefined}
            className={pending ? 'pointer-events-none opacity-60' : undefined}
          >
            {children}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending || disabled}
            onClick={run}
            className={cn(
              'gap-2',
              // 這是對話框的主要動作，用實心紅底而不是 destructive 變體的淡色底
              destructive && 'bg-destructive hover:bg-destructive/90 text-white',
              /*
                送出中不要壓暗。

                Button 的 disabled:opacity-50 是用來表示「這顆現在不能按」，
                但送出中轉圈本身已經說明狀態了，再變淡只會看起來像壞掉。
                真正因為條件未滿足而停用（disabled）時才維持變淡。
              */
              pending && !disabled && 'disabled:opacity-100',
            )}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
