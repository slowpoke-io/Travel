import { TripMapView } from '@/components/trip/trip-map-view'
import { getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { title: '地圖' }

export default async function TripMapPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const { bundle } = await getOwnerTripContext(tripId)
  const vm = buildTripViewModel(bundle)

  return <TripMapView days={bundle.days} byDay={Object.fromEntries(vm.byDay)} />
}
