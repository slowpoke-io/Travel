'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { STORAGE_BUCKET } from '@/lib/constants'
import { isSupportedImage, prepareImage } from '@/lib/image-compress'
import type { CommitImageInput } from '@/lib/mutations/images'
import { createClient } from '@/lib/supabase/client'
import type { ImageRole } from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'

export type PendingUpload = {
  id: string
  /** object URL，供表單內預覽 */
  previewUrl: string
  status: 'uploading' | 'done' | 'error'
  /** 0–100，壓縮與兩次直傳合起來算 */
  progress: number
  /** 上傳完成後才有，送出表單時用來寫入 images */
  committed?: Omit<CommitImageInput, 'role'>
  error?: string
}

const MAX = 10

/**
 * 選好圖片就立刻開始上傳，而不是等按下送出。
 *
 * 這樣使用者可以在上傳的同時繼續填其他欄位，不必填完再乾等一次。
 * 檔案先進 Storage，資料列則等到表單送出、行程／旅遊真的存在之後才寫入
 * （images 的外鍵需要對象）。中途放棄的話檔案會變成孤兒，由
 * scripts/cleanup-orphan-media.ts 負責清理 —— 這是換取「邊填邊傳」的代價。
 */
export function usePendingUploads(tripId: string | null) {
  const mutations = useTripMutations()
  const [items, setItems] = useState<PendingUpload[]>([])

  // 卸載時釋放 object URL
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useEffect(() => {
    return () => {
      for (const i of itemsRef.current) URL.revokeObjectURL(i.previewUrl)
    }
  }, [])

  const update = useCallback(
    (id: string, patch: Partial<PendingUpload>) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      )
    },
    [],
  )

  const add = useCallback(
    async (files: File[]) => {
      const valid = files.filter(isSupportedImage)
      if (!valid.length) return

      const room = MAX - itemsRef.current.length
      const batch = valid.slice(0, room).map((file) => ({
        file,
        entry: {
          id: crypto.randomUUID(),
          previewUrl: URL.createObjectURL(file),
          status: 'uploading' as const,
          progress: 0,
        },
      }))
      setItems((prev) => [...prev, ...batch.map((b) => b.entry)])

      if (!tripId) {
        // 建立旅遊時還沒有 tripId，只能等送出後再傳
        for (const b of batch) update(b.entry.id, { status: 'done', progress: 100 })
        return
      }

      const supabase = createClient()

      await Promise.all(
        batch.map(async ({ file, entry }) => {
          try {
            update(entry.id, { progress: 10 })
            const prepared = await prepareImage(file)
            update(entry.id, { progress: 40 })

            const slots = await mutations.requestUploadSlots(1)
            if (!slots.ok) throw new Error(slots.error)
            const slot = slots.data[0]
            update(entry.id, { progress: 55 })

            const [main, thumb] = await Promise.all([
              supabase.storage
                .from(STORAGE_BUCKET)
                .uploadToSignedUrl(slot.path, slot.pathToken, prepared.main, {
                  contentType: prepared.mime,
                }),
              supabase.storage
                .from(STORAGE_BUCKET)
                .uploadToSignedUrl(
                  slot.thumbPath,
                  slot.thumbToken,
                  prepared.thumb,
                  { contentType: prepared.mime },
                ),
            ])
            if (main.error) throw main.error
            if (thumb.error) throw thumb.error

            update(entry.id, {
              status: 'done',
              progress: 100,
              committed: {
                path: slot.path,
                thumbPath: slot.thumbPath,
                width: prepared.width,
                height: prepared.height,
                bytes: prepared.bytes,
                mime: prepared.mime,
              },
            })
          } catch (e) {
            console.error('[usePendingUploads]', e)
            update(entry.id, {
              status: 'error',
              progress: 0,
              error: e instanceof Error ? e.message : '上傳失敗',
            })
          }
        }),
      )
    },
    [tripId, mutations, update],
  )

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const reorder = useCallback((next: PendingUpload[]) => setItems(next), [])

  const clear = useCallback(() => {
    for (const i of itemsRef.current) URL.revokeObjectURL(i.previewUrl)
    setItems([])
  }, [])

  /** 還有東西在傳的話，表單的送出按鈕要維持停用 */
  const uploading = items.some((i) => i.status === 'uploading')
  const failed = items.filter((i) => i.status === 'error').length

  /**
   * 送出表單時要寫入 images 的資料。
   * 封面只能有一張，所以第一張才是 cover（已有封面時全部歸 info）。
   */
  const toCommitInputs = useCallback(
    (hasExistingCover: boolean): CommitImageInput[] =>
      items
        .filter((i) => i.committed)
        .map((i, index) => ({
          ...i.committed!,
          role: (index === 0 && !hasExistingCover
            ? 'cover'
            : 'info') as ImageRole,
        })),
    [items],
  )

  return {
    items,
    add,
    remove,
    reorder,
    clear,
    uploading,
    failed,
    toCommitInputs,
  }
}
