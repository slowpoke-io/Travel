'use client'

import Link from 'next/link'
import { ArrowLeft, Eye, PenLine, Settings2 } from 'lucide-react'

import { BottomNav } from '@/components/trip/bottom-nav'
import {
  TripAccessProvider,
  type TripAccess,
} from '@/components/trip/trip-access'
import { Badge } from '@/components/ui/badge'

/**
 * 旅遊內頁的外框：頂部標題列 + 底部導覽 + 存取模式 context。
 *
 * 擁有者路徑與分享路徑共用同一個 shell，差別只在 access 的內容。
 */
export function TripShell({
  access,
  title,
  showExpenses,
  children,
}: {
  access: TripAccess
  title: string
  /** 這趟旅遊要不要顯示花費分頁（訪客由擁有者逐趟決定） */
  showExpenses: boolean
  children: React.ReactNode
}) {
  const isGuest = access.mode === 'guest'

  return (
    <TripAccessProvider value={access}>
      <div className="pb-bottom-nav mx-auto min-h-dvh w-full max-w-md">
        <header className="pt-safe bg-background/90 sticky top-0 z-20 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-2.5">
            {!isGuest ? (
              <Link
                href="/trips"
                aria-label="回到旅遊列表"
                className="hover:bg-muted flex size-9 shrink-0 items-center justify-center rounded-full"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </Link>
            ) : null}

            <Link
              href={
                isGuest ? `/s/${access.shareToken}` : `/trips/${access.tripId}`
              }
              className="min-w-0 flex-1"
            >
              <h1 className="truncate font-semibold">{title}</h1>
            </Link>

            {isGuest ? (
              <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                {access.canEdit ? (
                  <>
                    <PenLine className="size-3" aria-hidden />
                    可編輯
                  </>
                ) : (
                  <>
                    <Eye className="size-3" aria-hidden />
                    唯讀
                  </>
                )}
              </Badge>
            ) : (
              /*
                設定從底部導覽搬到這裡 —— 底部四格留給每天都會用到的分頁。
                設定是偶爾才進去一次的東西，不值得佔一格。
              */
              <Link
                href={`/trips/${access.tripId}/settings`}
                prefetch
                aria-label="旅遊設定"
                className="hover:bg-muted flex size-9 shrink-0 items-center justify-center rounded-full"
              >
                <Settings2 className="size-5" aria-hidden />
              </Link>
            )}
          </div>
        </header>

        {children}

        <BottomNav showExpenses={showExpenses} />
      </div>
    </TripAccessProvider>
  )
}
