import { notFound } from 'next/navigation'

import { TripTabs } from '@/components/trip/trip-tabs'
import { parseFilters } from '@/lib/activity-filters'
import { isPlaceSearchEnabled } from '@/lib/env'
import { findDay, getShareTripContext } from '@/lib/trip-context'
import { parseTripView } from '@/lib/trip-nav'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { robots: { index: false, follow: false } }

/** 分享連結版本。與擁有者路徑共用 TripTabs，差別只在資料來源與權限。 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; view: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { token, view } = await params
  const parsed = parseTripView(view)
  if (!parsed) notFound()

  const { bundle } = await getShareTripContext(token)
  if (parsed.tab === 'day') findDay(bundle, parsed.dayIndex)

  const vm = buildTripViewModel(bundle)

  return (
    <TripTabs
      trip={bundle.trip}
      expenses={bundle.expenses}
      days={bundle.days}
      activitiesByDay={Object.fromEntries(vm.byDay)}
      backlogActivities={vm.backlog}
      tags={bundle.tags}
      counts={vm.counts}
      placeSearchEnabled={isPlaceSearchEnabled()}
      initialFilters={parseFilters(await searchParams)}
    />
  )
}
