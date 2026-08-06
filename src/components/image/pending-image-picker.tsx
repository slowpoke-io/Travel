'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { isSupportedImage } from '@/lib/image-compress'

export type PendingImage = {
  file: File
  /** object URL，僅供表單內預覽 */
  previewUrl: string
}

const MAX_IMAGES = 10

/**
 * 表單內的「待上傳」圖片選擇器。
 *
 * 新增行程時該行程還不存在，images 表的外鍵沒有對象可指，
 * 所以這裡只先留住 File 與預覽，等行程建立成功後才真正上傳。
 *
 * 這樣做的好處是：使用者中途取消，Storage 不會留下任何孤兒檔案。
 * 代價是按下「新增」後要多等一下上傳，因此送出時會顯示進度。
 */
export function PendingImagePicker({
  images,
  onChange,
  /** 這個行程目前是否已經有封面（有的話新圖就不會再標成封面） */
  hasExistingCover,
}: {
  images: PendingImage[]
  onChange: (next: PendingImage[]) => void
  hasExistingCover: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // 元件卸載時釋放 object URL，否則會累積佔記憶體
  const imagesRef = useRef(images)
  useEffect(() => {
    imagesRef.current = images
  }, [images])
  useEffect(() => {
    return () => {
      for (const img of imagesRef.current) URL.revokeObjectURL(img.previewUrl)
    }
  }, [])

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter(isSupportedImage)
    e.target.value = '' // 允許重選同一張
    if (!picked.length) return

    const room = MAX_IMAGES - images.length
    const next = picked.slice(0, room).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    onChange([...images, ...next])
  }

  function remove(index: number) {
    URL.revokeObjectURL(images[index].previewUrl)
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePick}
        className="hidden"
      />

      {images.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {images.map((img, index) => {
            const isCover = index === 0 && !hasExistingCover
            return (
              <li key={img.previewUrl} className="relative">
                <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                  <Image
                    src={img.previewUrl}
                    alt=""
                    fill
                    sizes="25vw"
                    unoptimized
                    className="object-cover"
                  />
                </div>
                {isCover ? (
                  <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[9px] text-white">
                    封面
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="移除這張圖片"
                  className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {images.length < MAX_IMAGES ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="w-full gap-2"
        >
          <ImagePlus className="size-4" aria-hidden />
          {images.length ? '再加圖片' : '加入圖片'}
        </Button>
      ) : null}

      <p className="text-muted-foreground text-xs">
        {images.length
          ? `第一張會成為封面。儲存後可在行程詳情頁調整用途或再加圖。`
          : '可先加封面或票券截圖，之後在詳情頁還能分類成資訊／紀錄。'}
      </p>
    </div>
  )
}

/**
 * 決定每張待上傳圖片的用途。
 * 封面只能有一張（資料庫的 partial unique index 會擋），
 * 所以已經有封面時，新加的一律歸到「資訊」。
 */
export function resolvePendingRoles(
  count: number,
  hasExistingCover: boolean,
): ('cover' | 'info')[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 && !hasExistingCover ? 'cover' : 'info',
  )
}
