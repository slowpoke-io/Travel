import { notFound } from 'next/navigation'

import { ActivityDetail } from '@/components/activity/activity-detail'
import { TripShell } from '@/components/trip/trip-shell'
import { isPlaceSearchEnabled } from '@/lib/env'
import { getShareTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { robots: { index: false, follow: false } }

export default async function SharedActivityPage({
  params,
}: {
  params: Promise<{ token: string; activityId: string }>
}) {
  const { token, activityId } = await params
  const { bundle, access } = await getShareTripContext(token)

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
