'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ImagePickerButton } from '@/components/image/image-picker-button'
import { Lightbox } from '@/components/image/lightbox'
import { useTripAccess } from '@/components/trip/trip-access'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getThumbUrl } from '@/lib/image-url'
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
  const [lightbox, setLightbox] = useState<{
    images: ImageRow[]
    index: number
  } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ImageRow | null>(null)

  const byRole = (role: ImageRole) => images.filter((i) => i.role === role)

  async function remove(image: ImageRow) {
    const result = await mutations.deleteImage(image.id)
    if (!result.ok) {
      toast.error('刪除失敗', { description: result.error })
      return false
    }
    toast.success('已刪除圖片')
    setLightbox(null)
    router.refresh()
    return true
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
                  {list.map((image, index) => {
                    const url = getThumbUrl(image)
                    return (
                      <li key={image.id} className="relative">
                        <button
                          type="button"
                          onClick={() => setLightbox({ images: list, index })}
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
            </TabsContent>
          )
        })}
      </Tabs>

      {lightbox ? (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          canEdit={canEdit}
          pending={pending}
          onClose={() => setLightbox(null)}
          onMakeCover={makeCover}
          onDelete={setConfirmDelete}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(next) => !next && setConfirmDelete(null)}
        title="刪除這張圖片？"
        description="檔案會從儲存空間一併移除，無法復原。"
        confirmLabel="刪除"
        destructive
        onConfirm={() => remove(confirmDelete!)}
      />
    </>
  )
}
