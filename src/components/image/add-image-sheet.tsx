'use client'

import { useRouter } from 'next/navigation'
import { Camera, FileText, ImageIcon } from 'lucide-react'

import { ImagePickerButton } from '@/components/image/image-picker-button'
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
}: {
  activityId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()

  function handleUploaded() {
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>加入圖片</DrawerTitle>
          <DrawerDescription>
            選擇圖片的用途，之後在行程詳情頁也能調整。
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-2 px-4">
          {ROLES.map(({ role, icon: Icon, label, hint }) => (
            <div
              key={role}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
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
              />
            </div>
          ))}
        </div>

        <div className="pb-safe px-4 py-4">
          <Button
            variant="ghost"
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
