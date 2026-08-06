import { TripMapView } from '@/components/trip/trip-map-view'
import { TripShell } from '@/components/trip/trip-shell'
import { getShareTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { robots: { index: false, follow: false } }

export default async function SharedMapPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { bundle, access } = await getShareTripContext(token)
  const vm = buildTripViewModel(bundle)

  return (
    <TripShell
      access={access}
      title={bundle.trip.title}
      currentDayIndex={1}
    >
      <TripMapView
        days={bundle.days}
        byDay={Object.fromEntries(vm.byDay)}
      />
    </TripShell>
  )
}
