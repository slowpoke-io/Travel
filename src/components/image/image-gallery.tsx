'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ImageIcon, Loader2, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { ImagePickerButton } from '@/components/image/image-picker-button'
import { useTripAccess } from '@/components/trip/trip-access'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getImageUrl, getThumbUrl } from '@/lib/image-url'
import type { ImageRole, ImageRow } from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'

const TABS: { role: ImageRole; label: string; hint: string }[] = [
  { role: 'cover', label: '封面', hint: '顯示在行程卡片上的代表圖' },
  { role: 'info', label: '資訊', hint: '票券、菜單、營業時間截圖' },
  { role: 'record', label: '紀錄', hint: '旅遊當下拍的照片' },
]

/**
 * 行程圖片相簿，依 image_role 分成三個分頁。
 *
 * 把「規劃時要查的資訊」與「回來後的回憶照片」分開，
 * 是因為兩者的使用時機完全不同 —— 混在一起找票券會很痛苦。
 */
export function ImageGallery({
  activityId,
  images,
}: {
  activityId: string
  images: ImageRow[]
}) {
  const router = useRouter()
  const { canEdit } = useTripAccess()
  const mutations = useTripMutations()
  const [pending, startTransition] = useTransition()
  const [lightbox, setLightbox] = useState<ImageRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ImageRow | null>(null)

  const byRole = (role: ImageRole) => images.filter((i) => i.role === role)

  function remove(image: ImageRow) {
    startTransition(async () => {
      const result = await mutations.deleteImage(image.id)
      if (!result.ok) {
        toast.error('刪除失敗', { description: result.error })
        return
      }
      toast.success('已刪除圖片')
      setConfirmDelete(null)
      setLightbox(null)
      router.refresh()
    })
  }

  function makeCover(image: ImageRow) {
    startTransition(async () => {
      const result = await mutations.setCoverImage(image.id)
      if (!result.ok) {
        toast.error('設定封面失敗', { description: result.error })
        return
      }
      toast.success('已設為封面')
      router.refresh()
    })
  }

  return (
    <>
      <Tabs defaultValue="cover">
        <TabsList className="w-full">
          {TABS.map(({ role, label }) => (
            <TabsTrigger key={role} value={role} className="flex-1">
              {label}
              {byRole(role).length ? (
                <span className="text-muted-foreground ml-1 text-[10px]">
                  {byRole(role).length}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ role, label, hint }) => {
          const list = byRole(role)
          return (
            <TabsContent key={role} value={role} className="mt-3 space-y-3">
              <p className="text-muted-foreground text-xs">{hint}</p>

              {list.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-xs">
                  <ImageIcon className="size-5" aria-hidden />
                  還沒有{label}圖片
                </div>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {list.map((image) => {
                    const url = getThumbUrl(image)
                    return (
                      <li key={image.id} className="relative">
                        <button
                          type="button"
                          onClick={() => setLightbox(image)}
                          className="bg-muted relative block aspect-square w-full overflow-hidden rounded-lg"
                        >
                          {url ? (
                            <Image
                              src={url}
                              alt={image.caption ?? ''}
                              fill
                              sizes="33vw"
                              className="object-cover"
                            />
                          ) : null}
                        </button>
                        {image.role === 'cover' ? (
                          <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">
                            封面
                          </span>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}

              {/*
                封面只能有一張（資料庫的 partial unique index 擋著），
                已經有封面時就不該再出現「加入封面圖片」——
                要換封面是到其他分頁長按圖片選「設為封面」。
              */}
              {canEdit && !(role === 'cover' && list.length > 0) ? (
                <ImagePickerButton
                  activityId={activityId}
                  role={role}
                  label={`加入${label}圖片`}
                  className="w-full"
                  onUploaded={() => router.refresh()}
                />
              ) : null}

              {role === 'cover' && list.length > 0 && canEdit ? (
                <p className="text-muted-foreground text-center text-xs">
                  封面只能有一張。要換的話，到「資訊」或「紀錄」分頁點圖片後選「設為封面」。
                </p>
              ) : null}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* 燈箱 */}
      {lightbox ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="pt-safe flex items-center justify-between px-2 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLightbox(null)}
              className="text-white hover:bg-white/10 hover:text-white"
              aria-label="關閉"
            >
              <X className="size-5" aria-hidden />
            </Button>

            {canEdit ? (
              <div className="flex gap-1">
                {lightbox.role !== 'cover' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => makeCover(lightbox)}
                    className="gap-1.5 text-white hover:bg-white/10 hover:text-white"
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Star className="size-4" aria-hidden />
                    )}
                    設為封面
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete(lightbox)}
                  className="text-white hover:bg-white/10 hover:text-white"
                  aria-label="刪除圖片"
                >
                  <Trash2 className="size-5" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="relative flex-1">
            <Image
              src={getImageUrl(lightbox.path) ?? ''}
              alt={lightbox.caption ?? ''}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {lightbox.caption ? (
            <p className="pb-safe px-4 py-3 text-center text-sm text-white/80">
              {lightbox.caption}
            </p>
          ) : null}
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除這張圖片？</AlertDialogTitle>
            <AlertDialogDescription>
              圖片檔案會一併從儲存空間刪除，無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirmDelete) remove(confirmDelete)
              }}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
