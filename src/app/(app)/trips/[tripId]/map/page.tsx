import { TripMapView } from '@/components/trip/trip-map-view'
import { TripShell } from '@/components/trip/trip-shell'
import { isMapsEnabled } from '@/lib/env'
import { getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { title: '地圖' }

export default async function TripMapPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const { bundle, access } = await getOwnerTripContext(tripId)
  const vm = buildTripViewModel(bundle)

  return (
    <TripShell
      access={access}
      title={bundle.trip.title}
      currentDayIndex={1}
      mapsEnabled={isMapsEnabled()}
    >
      <TripMapView
        days={bundle.days}
        byDay={Object.fromEntries(vm.byDay)}
        mapsEnabled={isMapsEnabled()}
      />
    </TripShell>
  )
}
