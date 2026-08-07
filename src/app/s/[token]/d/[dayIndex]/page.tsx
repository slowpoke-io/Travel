import { notFound } from 'next/navigation'

import { DayView } from '@/components/trip/day-view'
import { isPlaceSearchEnabled } from '@/lib/env'
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

  const { bundle } = await getShareTripContext(token)
  const day = findDay(bundle, index)
  const vm = buildTripViewModel(bundle)

  return (
    <DayView
      days={bundle.days}
      activitiesByDay={Object.fromEntries(vm.byDay)}
      initialDayIndex={day.day_index}
      backlogActivities={vm.backlog}
      tags={bundle.tags}
      counts={vm.counts}
      placeSearchEnabled={isPlaceSearchEnabled()}
    />
  )
}
