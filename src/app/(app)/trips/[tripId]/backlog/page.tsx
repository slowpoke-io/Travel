import { BacklogView } from '@/components/trip/backlog-view'
import { isPlaceSearchEnabled } from '@/lib/env'
import { getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { title: '行程儲備區' }

export default async function BacklogPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const { bundle } = await getOwnerTripContext(tripId)
  const vm = buildTripViewModel(bundle)

  return (
    <BacklogView
      days={bundle.days}
      backlogActivities={vm.backlog}
      tags={bundle.tags}
      counts={vm.counts}
      placeSearchEnabled={isPlaceSearchEnabled()}
    />
  )
}
