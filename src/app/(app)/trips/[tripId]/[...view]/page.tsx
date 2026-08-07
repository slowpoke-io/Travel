import { notFound } from 'next/navigation'

import { TripTabs } from '@/components/trip/trip-tabs'
import { parseFilters } from '@/lib/activity-filters'
import { isPlaceSearchEnabled } from '@/lib/env'
import { findDay, getOwnerTripContext } from '@/lib/trip-context'
import { parseTripView } from '@/lib/trip-nav'
import { buildTripViewModel } from '@/lib/trip-view-model'

type Params = Promise<{ tripId: string; view: string[] }>

/**
 * 行程 / 儲備區 / 地圖共用同一條路由。
 *
 * 它們讀的是同一份 loadTripBundle，拆成三條路由只會讓每次切分頁都要伺服器
 * 把同樣的查詢重跑一次。合成一條之後，切換由 client 端接手（見 trip-nav.ts），
 * 而 /d/3、/backlog、/map 這些網址仍然可以直接開、可以分享。
 */
export async function generateMetadata({ params }: { params: Params }) {
  const { tripId, view } = await params
  const parsed = parseTripView(view)
  if (!parsed) return {}

  const { bundle } = await getOwnerTripContext(tripId)
  const suffix = ` · ${bundle.trip.title}`
  if (parsed.tab === 'backlog') return { title: `行程儲備區${suffix}` }
  if (parsed.tab === 'map') return { title: `地圖${suffix}` }
  return { title: `Day ${parsed.dayIndex}${suffix}` }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tripId, view } = await params
  const parsed = parseTripView(view)
  if (!parsed) notFound()

  const { bundle } = await getOwnerTripContext(tripId)
  // 不存在的天數要 404，不要靜靜地退回 Day 1
  if (parsed.tab === 'day') findDay(bundle, parsed.dayIndex)

  const vm = buildTripViewModel(bundle)

  return (
    <TripTabs
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
