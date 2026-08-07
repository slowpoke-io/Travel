'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ImageOff, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteImage } from '@/actions/owner/images'
import { ImagePickerButton } from '@/components/image/image-picker-button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/lib/image-url'
import type { ImageRow } from '@/lib/supabase/database.types'

/**
 * 旅遊封面。
 *
 * 對應 images 表中 activity_id 為 NULL、role 為 cover 的那一列 ——
 * 也就是「屬於整趟旅遊而非某個行程」的圖片。
 * 顯示在旅遊列表的卡片與概覽頁最上方。
 *
 * 這是旅遊本體的一部分，所以只有擁有者能改（放在設定頁，
 * 分享連結的訪客看不到這個區塊）。
 */
export function TripCoverManager({
  tripId,
  cover,
}: {
  tripId: string
  cover: ImageRow | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const url = cover ? getImageUrl(cover.path) : null

  function remove() {
    if (!cover) return
    startTransition(async () => {
      const result = await deleteImage(tripId, cover.id)
      if (!result.ok) {
        toast.error('刪除失敗', { description: result.error })
        return
      }
      toast.success('已移除封面')
      setConfirmOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden rounded-xl border">
        {url ? (
          <Image
            src={url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2">
            <ImageOff className="size-7" aria-hidden />
            <p className="text-xs">還沒有封面</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {/*
          封面只能有一張，所以已經有的時候是「更換」而不是「再加一張」。
          上傳的新圖同樣 role='cover'，partial unique index 會擋住第二張，
          因此要先刪掉舊的。
        */}
        {cover ? (
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
              className="flex-1 gap-2"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              移除封面
            </Button>
          </>
        ) : (
          <ImagePickerButton
            activityId={null}
            role="cover"
            label="選擇封面圖片"
            className="w-full"
            onUploaded={() => router.refresh()}
          />
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除旅遊封面？</AlertDialogTitle>
            <AlertDialogDescription>
              圖片檔案會一併從儲存空間刪除。行程本身不受影響。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
