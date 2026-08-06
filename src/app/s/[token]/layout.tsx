import { TripShell } from '@/components/trip/trip-shell'
import { getShareTripContext } from '@/lib/trip-context'

/** 分享路徑的外框，與擁有者路徑同一個 shell，差別只在 access 的內容 */
export default async function SharedTripLayout({
  params,
  children,
}: {
  params: Promise<{ token: string }>
  children: React.ReactNode
}) {
  const { token } = await params
  const { bundle, access } = await getShareTripContext(token)

  return (
    <TripShell access={access} title={bundle.trip.title}>
      {children}
    </TripShell>
  )
}
