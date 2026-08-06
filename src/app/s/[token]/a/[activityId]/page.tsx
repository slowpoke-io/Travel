import { notFound } from 'next/navigation'

import { ActivityDetail } from '@/components/activity/activity-detail'
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
  const { bundle } = await getShareTripContext(token)

  const activity = bundle.activities.find((a) => a.id === activityId)
  if (!activity) notFound()

  const vm = buildTripViewModel(bundle)

  return (
    <ActivityDetail
      activity={activity}
      tags={bundle.tags}
      days={bundle.days}
      counts={vm.counts}
      backlogCount={vm.backlog.length}
      placeSearchEnabled={isPlaceSearchEnabled()}
    />
  )
}
