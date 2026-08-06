'use client'

import { toast } from 'sonner'

import { commitImages, requestUploadSlots } from '@/actions/owner/images'
import { STORAGE_BUCKET } from '@/lib/constants'
import { prepareImage } from '@/lib/image-compress'
import { createClient } from '@/lib/supabase/client'

/**
 * 上傳旅遊封面。
 *
 * 建立旅遊時該旅遊還不存在，images 的外鍵沒有對象可指，所以表單只先留住
 * File，等旅遊建立成功拿到 id 之後才呼叫這裡。中途取消就不會產生孤兒檔案。
 *
 * 沒有走 useTripMutations 是因為那個 facade 綁在 TripAccessProvider 上，
 * 而建立旅遊的表單在任何 trip 的 context 之外 —— 這裡本來就只有擁有者會用到。
 */
export async function uploadTripCover(
  tripId: string,
  file: File,
): Promise<boolean> {
  try {
    const slotsResult = await requestUploadSlots(tripId, 1)
    if (!slotsResult.ok) {
      toast.error('封面上傳失敗', { description: slotsResult.error })
      return false
    }
    const slot = slotsResult.data[0]
    const prepared = await prepareImage(file)
    const supabase = createClient()

    const [main, thumb] = await Promise.all([
      supabase.storage
        .from(STORAGE_BUCKET)
        .uploadToSignedUrl(slot.path, slot.pathToken, prepared.main, {
          contentType: prepared.mime,
        }),
      supabase.storage
        .from(STORAGE_BUCKET)
        .uploadToSignedUrl(slot.thumbPath, slot.thumbToken, prepared.thumb, {
          contentType: prepared.mime,
        }),
    ])
    if (main.error) throw main.error
    if (thumb.error) throw thumb.error

    // activityId 為 null = 屬於整趟旅遊而非某個行程
    const commit = await commitImages(tripId, null, [
      {
        path: slot.path,
        thumbPath: slot.thumbPath,
        role: 'cover',
        width: prepared.width,
        height: prepared.height,
        bytes: prepared.bytes,
        mime: prepared.mime,
      },
    ])
    if (!commit.ok) {
      toast.error('封面已上傳但儲存失敗', { description: commit.error })
      return false
    }
    return true
  } catch (e) {
    console.error('[uploadTripCover]', e)
    toast.error('封面上傳失敗', {
      description: e instanceof Error ? e.message : '請檢查網路後再試',
    })
    return false
  }
}
