'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteTrip } from '@/actions/owner/trips'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * 刪除整趟旅遊。要求輸入完整標題才能確認 —— 這個操作會連帶刪掉
 * 所有行程與圖片檔案，無法復原。
 */
export function DeleteTripButton({
  tripId,
  title,
}: {
  tripId: string
  title: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pending, startTransition] = useTransition()

  const matches = confirmText.trim() === title.trim()

  function remove() {
    startTransition(async () => {
      const result = await deleteTrip(tripId)
      if (!result.ok) {
        toast.error('刪除失敗', { description: result.error })
        return
      }
      toast.success('旅遊已刪除')
      router.push('/trips')
    })
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setConfirmText('')
          setOpen(true)
        }}
        className="text-destructive hover:text-destructive w-full gap-2"
      >
        <Trash2 className="size-4" aria-hidden />
        刪除這趟旅遊
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除「{title}」？</AlertDialogTitle>
            <AlertDialogDescription>
              所有天數、行程、標籤與已上傳的圖片都會被永久刪除，無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-title" className="text-sm">
              請輸入旅遊名稱以確認
            </Label>
            <Input
              id="confirm-title"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={title}
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!matches || pending}
              onClick={remove}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              永久刪除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
