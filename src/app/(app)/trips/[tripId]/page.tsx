import { TripOverview } from '@/components/trip/trip-overview'
import { getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const { bundle } = await getOwnerTripContext(tripId)
  return { title: bundle.trip.title }
}

export default async function TripOverviewPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const { bundle } = await getOwnerTripContext(tripId)
  const vm = buildTripViewModel(bundle)

  return (
    <TripOverview
      trip={bundle.trip}
      days={bundle.days}
      byDay={Object.fromEntries(vm.byDay)}
      backlogCount={vm.backlog.length}
      totalActivities={vm.totalActivities}
      tripImages={bundle.tripImages}
    />
  )
}
