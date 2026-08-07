'use client'

import { useEffect, useRef } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useImageUpload } from '@/lib/use-image-upload'
import type { ImageRole } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

/**
 * 選圖並上傳的按鈕。
 *
 * 沒有加 `capture` 屬性 —— 那會強制開相機，反而擋掉「從相簿選既有照片」，
 * 而旅遊紀錄多半是事後從相簿挑的。系統的選擇器本來就同時提供拍照與相簿。
 */
export function ImagePickerButton({
  activityId,
  role,
  label = '加入圖片',
  variant = 'outline',
  className,
  onUploaded,
  onUploadingChange,
}: {
  activityId: string | null
  role: ImageRole
  label?: string
  variant?: 'outline' | 'secondary' | 'ghost' | 'default'
  className?: string
  onUploaded?: () => void
  /** 讓外層（例如面板）可以在上傳中鎖住其他操作 */
  onUploadingChange?: (uploading: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, progress } = useImageUpload()

  useEffect(() => {
    onUploadingChange?.(progress.uploading)
    return () => onUploadingChange?.(false)
  }, [progress.uploading, onUploadingChange])

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // 允許重選同一張
    if (!files.length) return

    const success = await upload(files, { activityId, role })
    if (success) onUploaded?.()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant={variant}
        disabled={progress.uploading}
        onClick={() => inputRef.current?.click()}
        className={cn('gap-2', className)}
      >
        {progress.uploading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            上傳中 {progress.done}/{progress.total}
          </>
        ) : (
          <>
            <ImagePlus className="size-4" aria-hidden />
            {label}
          </>
        )}
      </Button>
    </>
  )
}
