import { TripMapView } from '@/components/trip/trip-map-view'
import { getShareTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { robots: { index: false, follow: false } }

export default async function SharedMapPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { bundle } = await getShareTripContext(token)
  const vm = buildTripViewModel(bundle)

  return <TripMapView days={bundle.days} byDay={Object.fromEntries(vm.byDay)} />
}
