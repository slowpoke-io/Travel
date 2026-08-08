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
 * （images 的外鍵需要對象）。刪掉預覽或放棄整張表單時會把已上傳的檔案一併
 * 刪除，不留孤兒。
 */
export function usePendingUploads(tripId: string | null) {
  const mutations = useTripMutations()
  const [items, setItems] = useState<PendingUpload[]>([])

  /*
    itemsRef 是清單的權威來源，而且「同步」更新。

    卸載時要把沒用到的檔案刪掉，那個清理函式讀的就是這個 ref。先前是靠
    useEffect 把 state 同步過來，但送出成功時「清空清單」與「關閉表單」會被
    React 批次處理成同一次 commit —— 同步用的 effect 根本來不及跑，卸載時
    讀到的是過期的清單，於是把剛剛才提交成功的檔案刪掉了。

    所有異動都走 commitItems，ref 與 state 一起更新，就沒有這個時間差。
  */
  const itemsRef = useRef<PendingUpload[]>([])

  const commitItems = useCallback(
    (next: PendingUpload[] | ((prev: PendingUpload[]) => PendingUpload[])) => {
      const value =
        typeof next === 'function' ? next(itemsRef.current) : next
      itemsRef.current = value
      setItems(value)
    },
    [],
  )

  // 元件卸載時釋放 object URL
  useEffect(() => {
    return () => {
      for (const i of itemsRef.current) URL.revokeObjectURL(i.previewUrl)
    }
  }, [])

  const update = useCallback(
    (id: string, patch: Partial<PendingUpload>) => {
      commitItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      )
    },
    [commitItems],
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
      commitItems((prev) => [...prev, ...batch.map((b) => b.entry)])

      if (!tripId) {
        // 建立旅遊時還沒有 tripId，只能等送出後再傳
        for (const b of batch) {
          update(b.entry.id, { status: 'done', progress: 100 })
        }
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
    [tripId, mutations, update, commitItems],
  )

  /**
   * 移除一張。若它已經傳進 Storage，一併把檔案刪掉 ——
   * 不刪的話它沒有任何 images 資料列指向，會變成使用者看不到也刪不掉的孤兒。
   */
  const remove = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((i) => i.id === id)
      if (target) {
        URL.revokeObjectURL(target.previewUrl)
        const paths = [
          target.committed?.path,
          target.committed?.thumbPath,
        ].filter((p): p is string => Boolean(p))
        if (paths.length) void mutations.discardPendingUploads(paths)
      }
      commitItems((prev) => prev.filter((i) => i.id !== id))
    },
    [mutations, commitItems],
  )

  const reorder = useCallback(
    (next: PendingUpload[]) => commitItems(next),
    [commitItems],
  )

  /**
   * 全部清掉。`discard` 為 true 時（放棄表單）連 Storage 的檔案一起刪；
   * 送出成功後呼叫則要傳 false —— 那些檔案已經有 images 資料列指向了。
   */
  const clear = useCallback(
    (discard = false) => {
      const paths: string[] = []
      for (const i of itemsRef.current) {
        URL.revokeObjectURL(i.previewUrl)
        if (discard && i.committed) {
          paths.push(i.committed.path)
          if (i.committed.thumbPath) paths.push(i.committed.thumbPath)
        }
      }
      if (paths.length) void mutations.discardPendingUploads(paths)
      commitItems([])
    },
    [mutations, commitItems],
  )

  /** 還有東西在傳的話，表單的送出按鈕要維持停用 */
  const uploading = items.some((i) => i.status === 'uploading')
  const failed = items.filter((i) => i.status === 'error').length

  /**
   * 送出表單時要寫入 images 的資料。
   *
   * 預設行為：封面只能有一張，所以第一張才是 cover（已有封面時全部歸 info）。
   * 傳入 fixedRole 則全部用同一個 role —— 花費的圖片沒有封面的概念。
   */
  const toCommitInputs = useCallback(
    (hasExistingCover: boolean, fixedRole?: ImageRole): CommitImageInput[] =>
      items
        .filter((i) => i.committed)
        .map((i, index) => ({
          ...i.committed!,
          role:
            fixedRole ??
            ((index === 0 && !hasExistingCover
              ? 'cover'
              : 'info') as ImageRole),
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
