import { notFound } from 'next/navigation'

import { DayView } from '@/components/trip/day-view'
import { TripShell } from '@/components/trip/trip-shell'
import { isMapsEnabled } from '@/lib/env'
import { findDay, getShareTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { robots: { index: false, follow: false } }

export default async function SharedDayPage({
  params,
}: {
  params: Promise<{ token: string; dayIndex: string }>
}) {
  const { token, dayIndex } = await params
  const index = Number(dayIndex)
  if (!Number.isInteger(index) || index < 1) notFound()

  const { bundle, access } = await getShareTripContext(token)
  const day = findDay(bundle, index)
  const vm = buildTripViewModel(bundle)

  return (
    <TripShell
      access={access}
      title={bundle.trip.title}
      currentDayIndex={index}
      mapsEnabled={isMapsEnabled()}
    >
      <DayView
        days={bundle.days}
        currentDay={day}
        dayActivities={vm.byDay.get(day.id) ?? []}
        backlogActivities={vm.backlog}
        tags={bundle.tags}
        counts={vm.counts}
        mapsEnabled={isMapsEnabled()}
      />
    </TripShell>
  )
}
