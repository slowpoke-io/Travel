import { BacklogView } from '@/components/trip/backlog-view'
import { isPlaceSearchEnabled } from '@/lib/env'
import { getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'
import { parseFilters } from '@/lib/activity-filters'

export const metadata = { title: '行程儲備區' }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
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
      initialFilters={parseFilters(await searchParams)}
    />
  )
}
