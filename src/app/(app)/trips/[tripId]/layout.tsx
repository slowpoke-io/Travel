import { TripShell } from '@/components/trip/trip-shell'
import { getOwnerTripContext } from '@/lib/trip-context'

/**
 * 旅遊內頁的外框放在 layout 而不是每個 page。
 *
 * 這樣切換頁面（換一天、切到地圖）時，頂部標題列與底部導覽會留在原地
 * 不重繪，只有內容區換成 loading.tsx 的骨架 —— 少了「整頁閃一下」的感覺。
 *
 * getOwnerTripContext 有 React cache 包著，layout 與 page 各呼叫一次
 * 也只會真的查一次資料庫。
 */
export default async function TripLayout({
  params,
  children,
}: {
  params: Promise<{ tripId: string }>
  children: React.ReactNode
}) {
  const { tripId } = await params
  const { bundle, access } = await getOwnerTripContext(tripId)

  return (
    <TripShell
      access={access}
      title={bundle.trip.title}
      showExpenses={true}
    >
      {children}
    </TripShell>
  )
}
