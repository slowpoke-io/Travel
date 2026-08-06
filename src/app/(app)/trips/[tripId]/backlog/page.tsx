import { BacklogView } from '@/components/trip/backlog-view'
import { TripShell } from '@/components/trip/trip-shell'
import { isMapsEnabled } from '@/lib/env'
import { getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { title: '行程儲備區' }

export default async function BacklogPage({
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
      <BacklogView
        days={bundle.days}
        backlogActivities={vm.backlog}
        tags={bundle.tags}
        counts={vm.counts}
        mapsEnabled={isMapsEnabled()}
      />
    </TripShell>
  )
}
