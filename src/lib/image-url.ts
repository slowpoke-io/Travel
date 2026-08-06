import { STORAGE_BUCKET } from '@/lib/constants'
import { storagePublicBase } from '@/lib/env'
import type { ImageRow } from '@/lib/supabase/database.types'

/**
 * 由 storage 路徑組出可直接使用的圖片 URL。
 *
 * bucket 是公開讀取的，所以 URL 穩定、可被 Service Worker 永久快取，
 * 分享連結也能直接顯示圖片而不需要代簽。
 *
 * 若日後改成私有 bucket，只需要改這裡（換成簽名 URL），其餘程式碼不受影響。
 */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${storagePublicBase()}/${STORAGE_BUCKET}/${path}`
}

/** 列表 / 卡片用縮圖，沒有縮圖時退回原圖 */
export function getThumbUrl(image: Pick<ImageRow, 'path' | 'thumb_path'>) {
  return getImageUrl(image.thumb_path) ?? getImageUrl(image.path)
}

/** 從圖片陣列中挑出封面 */
export function pickCover<T extends { role: string }>(
  images: T[] | null | undefined,
): T | null {
  if (!images?.length) return null
  return images.find((i) => i.role === 'cover') ?? images[0]
}
