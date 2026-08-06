import { TripOverview } from '@/components/trip/trip-overview'
import { TripShell } from '@/components/trip/trip-shell'
import { getShareTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

/** 分享頁不該被搜尋引擎索引 */
export const metadata = {
  robots: { index: false, follow: false },
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { bundle, access } = await getShareTripContext(token)
  const vm = buildTripViewModel(bundle)

  return (
    <TripShell
      access={access}
      title={bundle.trip.title}
      currentDayIndex={1}
    >
      <TripOverview
        trip={bundle.trip}
        days={bundle.days}
        byDay={Object.fromEntries(vm.byDay)}
        backlogCount={vm.backlog.length}
        totalActivities={vm.totalActivities}
        tripImages={bundle.tripImages}
      />
    </TripShell>
  )
}
