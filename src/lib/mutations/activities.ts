import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { emptyToNull, type ActivityInput } from '@/lib/schemas'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

/**
 * 行程異動的核心邏輯。
 *
 * 這些函式不做授權判斷 —— 授權由呼叫端負責：
 *   - actions/owner/*  傳入受 RLS 保護的 client（以登入者身分）
 *   - actions/share/*  先驗證 share token，再傳入 admin client
 *
 * 每個函式都以 `tripId` 明確過濾。對 share 路徑而言 tripId 來自已驗證的
 * share context 而非使用者輸入，因此即使 admin client 繞過 RLS，
 * 也不可能寫到別趟旅遊。
 */

function toRow(input: ActivityInput) {
  return {
    title: input.title,
    category: input.category,
    notes: emptyToNull(input.notes),
    links: input.links ?? [],
    times: input.times ?? [],
    place_name: emptyToNull(input.place_name),
    address: emptyToNull(input.address),
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    google_place_id: emptyToNull(input.google_place_id),
  }
}

async function syncTags(
  client: Client,
  tripId: string,
  activityId: string,
  tagIds: string[],
) {
  // 只接受屬於這趟旅遊的標籤，擋掉跨旅遊的 tag id
  const { data: validTags, error } = await client
    .from('tags')
    .select('id')
    .eq('trip_id', tripId)
    .in('id', tagIds.length ? tagIds : ['00000000-0000-0000-0000-000000000000'])

  if (error) throw error
  const valid = new Set((validTags ?? []).map((t) => t.id))

  await client.from('activity_tags').delete().eq('activity_id', activityId)

  const rows = tagIds
    .filter((id) => valid.has(id))
    .map((tagId) => ({ activity_id: activityId, tag_id: tagId }))

  if (rows.length) {
    const { error: insErr } = await client.from('activity_tags').insert(rows)
    if (insErr) throw insErr
  }
}

export async function createActivity(
  client: Client,
  params: {
    tripId: string
    dayId: string | null
    input: ActivityInput
    createdBy: string | null
  },
): Promise<string> {
  const { tripId, dayId, input, createdBy } = params

  // 附加到該容器（某一天，或 dayId = null 代表儲備區）的尾端
  const positionQuery = client
    .from('activities')
    .select('position')
    .eq('trip_id', tripId)
    .order('position', { ascending: false })
    .limit(1)

  const { data: last, error: posErr } = await (
    dayId === null
      ? positionQuery.is('day_id', null)
      : positionQuery.eq('day_id', dayId)
  ).maybeSingle()

  if (posErr) throw posErr
  const nextPosition = last ? last.position + 1 : 0

  const { data, error } = await client
    .from('activities')
    .insert({
      trip_id: tripId,
      day_id: dayId,
      position: nextPosition,
      created_by: createdBy,
      ...toRow(input),
    })
    .select('id')
    .single()

  if (error) throw error

  if (input.tagIds?.length) {
    await syncTags(client, tripId, data.id, input.tagIds)
  }
  return data.id
}

export async function updateActivity(
  client: Client,
  params: { tripId: string; activityId: string; input: ActivityInput },
): Promise<void> {
  const { tripId, activityId, input } = params

  const { error } = await client
    .from('activities')
    .update(toRow(input))
    .eq('id', activityId)
    .eq('trip_id', tripId)

  if (error) throw error

  await syncTags(client, tripId, activityId, input.tagIds ?? [])
}

export async function deleteActivity(
  client: Client,
  params: { tripId: string; activityId: string },
): Promise<string[]> {
  const { tripId, activityId } = params

  // 先取出 storage 路徑，DB cascade 只會刪掉 images 列，檔案要另外清
  const { data: images } = await client
    .from('images')
    .select('path, thumb_path')
    .eq('activity_id', activityId)
    .eq('trip_id', tripId)

  const { data: activity } = await client
    .from('activities')
    .select('day_id')
    .eq('id', activityId)
    .eq('trip_id', tripId)
    .maybeSingle()

  const { error } = await client
    .from('activities')
    .delete()
    .eq('id', activityId)
    .eq('trip_id', tripId)

  if (error) throw error

  // 補上刪除後留下的 position 空隙
  await client.rpc('renumber_container', {
    p_trip_id: tripId,
    p_day_id: activity?.day_id ?? null,
  })

  return (images ?? []).flatMap((i) =>
    [i.path, i.thumb_path].filter((p): p is string => Boolean(p)),
  )
}

export async function reorderActivities(
  client: Client,
  params: { tripId: string; dayId: string | null; ids: string[] },
): Promise<void> {
  const { error } = await client.rpc('reorder_activities', {
    p_trip_id: params.tripId,
    p_day_id: params.dayId,
    p_ids: params.ids,
  })
  if (error) throw error
}

export async function moveActivity(
  client: Client,
  params: { tripId: string; activityId: string; targetDayId: string | null },
): Promise<void> {
  // 先確認這個行程屬於這趟旅遊（admin client 沒有 RLS 保護）
  const { data, error: checkErr } = await client
    .from('activities')
    .select('id')
    .eq('id', params.activityId)
    .eq('trip_id', params.tripId)
    .maybeSingle()
  if (checkErr) throw checkErr
  if (!data) throw new Error('ACTIVITY_NOT_IN_TRIP')

  const { error } = await client.rpc('move_activity', {
    p_activity_id: params.activityId,
    p_target_day_id: params.targetDayId,
  })
  if (error) throw error
}

/** 一次把多個行程指派到同一天（儲備區的多選批次操作） */
export async function moveActivities(
  client: Client,
  params: { tripId: string; activityIds: string[]; targetDayId: string | null },
): Promise<void> {
  for (const activityId of params.activityIds) {
    await moveActivity(client, { ...params, activityId })
  }
}
