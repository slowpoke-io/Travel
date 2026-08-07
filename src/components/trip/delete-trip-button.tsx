'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteTrip } from '@/actions/owner/trips'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  /*
    刪除成功後不關閉對話框 —— 讓它一直蓋著直到跳轉完成，
    否則會先閃一下「已經被刪掉的旅遊」的設定頁。
  */
  const [deleted, setDeleted] = useState(false)

  const matches = confirmText.trim() === title.trim()

  async function remove() {
    const result = await deleteTrip(tripId)
    if (!result.ok) {
      toast.error('刪除失敗', { description: result.error })
      return false
    }
    setDeleted(true)
    toast.success('旅遊已刪除')
    router.push('/trips')
    return false
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

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`刪除「${title}」？`}
        description="所有天數、行程、標籤與已上傳的圖片都會被永久刪除，無法復原。"
        confirmLabel="永久刪除"
        destructive
        disabled={!matches || deleted}
        onConfirm={remove}
      >
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
      </ConfirmDialog>
    </>
  )
}
