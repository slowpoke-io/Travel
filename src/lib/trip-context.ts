import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'

import type { TripAccess } from '@/components/trip/trip-access'
import { requireUserOrRedirect } from '@/lib/auth'
import { loadTripBundle, type TripBundle } from '@/lib/queries'
import { resolveShare } from '@/lib/share/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * layout 與 page 都需要同一份旅遊資料。用 React cache 包起來，
 * 同一個請求內只會真的查一次資料庫。
 */
const loadOwnerBundle = cache(async (tripId: string) => {
  const supabase = await createClient()
  return loadTripBundle(supabase, tripId) // RLS 保證只讀得到自己的
})

const loadShareBundle = cache(async (token: string) => {
  const share = await resolveShare(token)
  if (!share) return null

  // token 已驗證通過，才用 admin client 讀取（匿名訪客沒有 session，無法靠 RLS）
  const bundle = await loadTripBundle(createAdminClient(), share.trip.id)
  return bundle ? { bundle, canEdit: share.canEdit } : null
})

export type TripPageContext = {
  bundle: TripBundle
  access: TripAccess
}

/** 擁有者路徑 /trips/[tripId]/* */
export async function getOwnerTripContext(
  tripId: string,
): Promise<TripPageContext> {
  await requireUserOrRedirect(`/trips/${tripId}`)
  const bundle = await loadOwnerBundle(tripId)
  if (!bundle) notFound()

  return {
    bundle,
    access: { mode: 'owner', canEdit: true, tripId },
  }
}

/** 分享路徑 /s/[token]/* */
export async function getShareTripContext(
  token: string,
): Promise<TripPageContext> {
  const result = await loadShareBundle(token)
  // 找不到、或分享已關閉 —— 一律 404，不透露 token 是否曾經有效
  if (!result) notFound()

  return {
    bundle: result.bundle,
    access: {
      mode: 'guest',
      canEdit: result.canEdit,
      tripId: result.bundle.trip.id,
      shareToken: token,
    },
  }
}

/** 依 dayIndex 找出當天；找不到就 404 */
export function findDay(bundle: TripBundle, dayIndex: number) {
  const day = bundle.days.find((d) => d.day_index === dayIndex)
  if (!day) notFound()
  return day
}
