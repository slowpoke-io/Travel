import { notFound } from 'next/navigation'

import { ActivityDetail } from '@/components/activity/activity-detail'
import { TripShell } from '@/components/trip/trip-shell'
import { isPlaceSearchEnabled } from '@/lib/env'
import { getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string; activityId: string }>
}) {
  const { tripId, activityId } = await params
  const { bundle } = await getOwnerTripContext(tripId)
  const activity = bundle.activities.find((a) => a.id === activityId)
  return { title: activity?.title ?? '行程' }
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; activityId: string }>
}) {
  const { tripId, activityId } = await params
  const { bundle, access } = await getOwnerTripContext(tripId)

  const activity = bundle.activities.find((a) => a.id === activityId)
  if (!activity) notFound()

  const vm = buildTripViewModel(bundle)
  const currentDay = bundle.days.find((d) => d.id === activity.day_id)

  return (
    <TripShell
      access={access}
      title={bundle.trip.title}
      currentDayIndex={currentDay?.day_index ?? 1}
    >
      <ActivityDetail
        activity={activity}
        tags={bundle.tags}
        days={bundle.days}
        counts={vm.counts}
        backlogCount={vm.backlog.length}
        placeSearchEnabled={isPlaceSearchEnabled()}
      />
    </TripShell>
  )
}
