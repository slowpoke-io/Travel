'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { STORAGE_BUCKET } from '@/lib/constants'
import { isSupportedImage, prepareImage } from '@/lib/image-compress'
import type { CommitImageInput } from '@/lib/mutations/images'
import { createClient } from '@/lib/supabase/client'
import type { ImageRole } from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'

const MAX_FILES = 10

export type UploadProgress = {
  uploading: boolean
  done: number
  total: number
}

/**
 * 圖片上傳流程：
 *   1. 瀏覽器端壓縮成 WebP（主圖 + 縮圖）
 *   2. 跟 server 要簽名上傳 URL（server 端在此驗權）
 *   3. 直接 PUT 到 Storage —— 不經過 Next.js server，手機上傳快、省頻寬
 *   4. 回頭呼叫 commitImages 寫入資料表
 *
 * 擁有者與分享連結的匿名訪客走完全相同的路徑，
 * 差別只在步驟 2 的 server action 是哪一個（由 useTripMutations 分派）。
 */
export function useImageUpload() {
  const mutations = useTripMutations()
  const [progress, setProgress] = useState<UploadProgress>({
    uploading: false,
    done: 0,
    total: 0,
  })

  const upload = useCallback(
    async (
      files: File[],
      options: {
        activityId: string | null
        /** 所有圖片的預設用途 */
        role: ImageRole
        /**
         * 逐張指定用途，索引對應 files。沒指定的沿用 role。
         *
         * 需要這個是因為資料庫的 partial unique index 只允許一張封面 ——
         * 一次上傳多張時不能全部標成 cover，否則第二張就會違反約束。
         */
        roles?: ImageRole[]
      },
    ): Promise<boolean> => {
      const valid = files.filter(isSupportedImage).slice(0, MAX_FILES)
      if (valid.length === 0) {
        toast.error('請選擇圖片檔')
        return false
      }
      if (files.length > MAX_FILES) {
        toast.warning(`一次最多上傳 ${MAX_FILES} 張，其餘已略過`)
      }

      setProgress({ uploading: true, done: 0, total: valid.length })

      try {
        const slotsResult = await mutations.requestUploadSlots(valid.length)
        if (!slotsResult.ok) {
          toast.error('無法開始上傳', { description: slotsResult.error })
          return false
        }
        const slots = slotsResult.data

        const supabase = createClient()
        const committed: CommitImageInput[] = []

        for (let i = 0; i < valid.length; i += 1) {
          const slot = slots[i]
          const prepared = await prepareImage(valid[i])

          const [mainRes, thumbRes] = await Promise.all([
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

          if (mainRes.error) throw mainRes.error
          if (thumbRes.error) throw thumbRes.error

          committed.push({
            path: slot.path,
            thumbPath: slot.thumbPath,
            role: options.roles?.[i] ?? options.role,
            width: prepared.width,
            height: prepared.height,
            bytes: prepared.bytes,
            mime: prepared.mime,
          })

          setProgress((p) => ({ ...p, done: i + 1 }))
        }

        const commitResult = await mutations.commitImages(
          options.activityId,
          committed,
        )
        if (!commitResult.ok) {
          toast.error('圖片已上傳但儲存失敗', {
            description: commitResult.error,
          })
          return false
        }

        toast.success(
          committed.length > 1
            ? `已上傳 ${committed.length} 張圖片`
            : '圖片已上傳',
        )
        return true
      } catch (e) {
        console.error('[useImageUpload]', e)
        toast.error('上傳失敗', {
          description: e instanceof Error ? e.message : '請檢查網路後再試',
        })
        return false
      } finally {
        setProgress({ uploading: false, done: 0, total: 0 })
      }
    },
    [mutations],
  )

  return { upload, progress }
}
