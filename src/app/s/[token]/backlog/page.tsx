import { BacklogView } from '@/components/trip/backlog-view'
import { isPlaceSearchEnabled } from '@/lib/env'
import { getShareTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { robots: { index: false, follow: false } }

export default async function SharedBacklogPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { bundle } = await getShareTripContext(token)
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
