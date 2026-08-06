'use client'

import imageCompression from 'browser-image-compression'

export type PreparedImage = {
  main: Blob
  thumb: Blob
  width: number
  height: number
  bytes: number
  mime: string
}

const MAIN_MAX_PX = 1600
const THUMB_MAX_PX = 400

async function readSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

/**
 * 上傳前在瀏覽器端壓縮。
 *
 * 為什麼在前端做：Supabase 免費方案沒有圖片轉檔服務，而手機直傳的原圖動輒 3–5MB，
 * 上傳慢又吃流量。壓成 WebP 後主圖約 300–600KB，縮圖約 20–40KB。
 *
 * 同時產生縮圖，讓列表捲動時只載小圖 —— 這是手機上最有感的效能差異。
 *
 * `browser-image-compression` 會處理 EXIF 方向，避免手機直拍的照片變成橫的。
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const common = {
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.82,
  }

  const [main, thumb] = await Promise.all([
    imageCompression(file, {
      ...common,
      maxWidthOrHeight: MAIN_MAX_PX,
      maxSizeMB: 0.8,
    }),
    imageCompression(file, {
      ...common,
      maxWidthOrHeight: THUMB_MAX_PX,
      maxSizeMB: 0.08,
      initialQuality: 0.75,
    }),
  ])

  const { width, height } = await readSize(main)

  return {
    main,
    thumb,
    width,
    height,
    bytes: main.size,
    mime: 'image/webp',
  }
}

export function isSupportedImage(file: File): boolean {
  return /^image\/(jpeg|png|webp|heic|heif|gif|avif)$/.test(file.type)
}
