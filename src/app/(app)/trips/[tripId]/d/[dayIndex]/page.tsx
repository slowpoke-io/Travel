import { notFound } from 'next/navigation'

import { DayView } from '@/components/trip/day-view'
import { isPlaceSearchEnabled } from '@/lib/env'
import { findDay, getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'
import { parseFilters } from '@/lib/activity-filters'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string; dayIndex: string }>
}) {
  const { tripId, dayIndex } = await params
  const { bundle } = await getOwnerTripContext(tripId)
  return { title: `Day ${dayIndex} · ${bundle.trip.title}` }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string; dayIndex: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tripId, dayIndex } = await params
  const index = Number(dayIndex)
  if (!Number.isInteger(index) || index < 1) notFound()

  const { bundle } = await getOwnerTripContext(tripId)
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
      initialFilters={parseFilters(await searchParams)}
    />
  )
}
