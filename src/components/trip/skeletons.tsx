import { Skeleton } from '@/components/ui/skeleton'

/**
 * 載入骨架。
 *
 * 每個頁面都是動態渲染（要讀 session、查資料庫），沒有 loading.tsx 的話
 * 切換時整個畫面會卡住不動，感覺像當掉。有骨架的話瀏覽器會立刻換頁，
 * 內容再串流進來 —— 同樣的等待時間，體感差很多。
 *
 * 骨架的形狀刻意貼近真實內容，避免內容進來時版面大幅跳動。
 */

export function ActivityListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card flex gap-3 rounded-xl border p-3">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="size-20 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function DayPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-200">
      {/* 日期分頁條 */}
      <div className="flex gap-2 overflow-hidden border-b px-4 py-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-[4.5rem] shrink-0 rounded-lg" />
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      <ActivityListSkeleton />
    </div>
  )
}

export function TripOverviewSkeleton() {
  return (
    <div className="animate-in fade-in duration-200">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 px-5 pt-5">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="space-y-2 px-5 pt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-xl border p-4">
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TripListSkeleton() {
  return (
    <div className="animate-in fade-in space-y-4 px-5 duration-200">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MapPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex gap-1.5 border-b px-4 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-14 shrink-0 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[52dvh] w-full rounded-none" />
    </div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="animate-in fade-in space-y-8 px-5 py-6 duration-200">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function ActivityDetailSkeleton() {
  return (
    <div className="animate-in fade-in duration-200">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-5 px-5 pt-5">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}

/** 花費分頁：總額 + 幾列清單 */
export function ExpensePageSkeleton() {
  return (
    <div className="animate-in fade-in duration-200">
      <div className="space-y-2 border-b px-4 py-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
