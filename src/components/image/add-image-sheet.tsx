'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Camera, FileText, ImageIcon } from 'lucide-react'

import { ImagePickerButton } from '@/components/image/image-picker-button'
import type { ImageRole } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

const ROLES = [
  {
    role: 'cover' as const,
    icon: ImageIcon,
    label: '封面',
    hint: '顯示在行程卡片與列表上',
  },
  {
    role: 'info' as const,
    icon: FileText,
    label: '資訊',
    hint: '票券、菜單、營業時間截圖',
  },
  {
    role: 'record' as const,
    icon: Camera,
    label: '旅遊紀錄',
    hint: '出遊當下拍的照片',
  },
]

/**
 * 選擇圖片用途後上傳。
 *
 * 三種用途對應資料庫的 image_role，讓「規劃時要看的資訊」與
 * 「回憶用的照片」不會混在同一個相簿裡。
 */
export function AddImageSheet({
  activityId,
  open,
  onOpenChange,
  hasCover = false,
}: {
  activityId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 這個行程是否已經有封面 —— 有的話就不提供「封面」選項 */
  hasCover?: boolean
}) {
  const router = useRouter()
  /*
    上傳中鎖住整個面板 —— 這時關掉它會讓使用者以為取消了，其實檔案還在傳。
    記的是「哪一種用途在傳」，這樣正在傳的那一列還看得到自己的進度，
    其他列則整個停用。
  */
  const [uploadingRole, setUploadingRole] = useState<ImageRole | null>(null)
  const uploading = uploadingRole !== null

  /*
    封面只能有一張（資料庫的 partial unique index 擋著），
    已經有的話再選「封面」只會撞上約束，所以直接不顯示。
    要換封面是到詳情頁點圖片選「設為封面」。
  */
  const roles = hasCover ? ROLES.filter((r) => r.role !== 'cover') : ROLES

  function handleUploaded() {
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} busy={uploading}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>加入圖片</DrawerTitle>
          <DrawerDescription>
            選擇圖片的用途，之後在行程詳情頁也能調整。
            {hasCover ? '（已有封面，要更換請到詳情頁點圖片設定）' : ''}
          </DrawerDescription>
        </DrawerHeader>

        <div
          className={cn(
            'space-y-2 px-4 transition-opacity',
            uploading && 'opacity-60',
          )}
        >
          {roles.map(({ role, icon: Icon, label, hint }) => (
            <div
              key={role}
              inert={(uploading && uploadingRole !== role) || undefined}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Icon
                className="text-muted-foreground size-5 shrink-0"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-muted-foreground text-xs">{hint}</p>
              </div>
              <ImagePickerButton
                activityId={activityId}
                role={role}
                label="選擇"
                variant="secondary"
                onUploaded={handleUploaded}
                onUploadingChange={(u) => setUploadingRole(u ? role : null)}
              />
            </div>
          ))}
        </div>

        <div className="pb-safe px-4 py-4">
          <Button
            variant="ghost"
            disabled={uploading}
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            取消
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
