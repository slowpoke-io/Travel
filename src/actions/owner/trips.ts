'use server'

import { revalidatePath } from 'next/cache'

import { fail, failFrom, ok, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { removeStorageObjects } from '@/lib/mutations/images'
import { tripInputSchema, type TripInput } from '@/lib/schemas'
import { newShareToken } from '@/lib/share/guard'
import { createClient } from '@/lib/supabase/server'

/**
 * 旅遊本體與天數結構的操作 —— 只有擁有者能做。
 *
 * 分享連結的匿名訪客沒有對應的 action（actions/share/ 底下刻意不存在這些函式），
 * 所以「訪客不能改旅遊名稱／日期／天數」是靠檔案不存在來保證，
 * 而不是靠條件式判斷 —— 之後改動條件也不會意外放寬權限。
 */

/** 每個 Server Action 都必須自行驗權：它可被直接 POST，不保證經過 proxy。 */
async function ownerContext() {
  const user = await requireUser()
  const supabase = await createClient()
  return { user, supabase }
}

async function assertOwnsTrip(tripId: string) {
  const { user, supabase } = await ownerContext()
  const { data, error } = await supabase
    .from('trips')
    .select('id, owner_id')
    .eq('id', tripId)
    .maybeSingle()

  if (error) throw error
  // RLS 已經擋掉別人的旅遊，查不到就是「不存在或不是你的」
  if (!data) throw new Error('TRIP_NOT_FOUND')
  return { user, supabase }
}

export async function createTrip(
  input: TripInput,
): Promise<ActionResult<string>> {
  try {
    const parsed = tripInputSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }
    const { user, supabase } = await ownerContext()
    const v = parsed.data

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        owner_id: user.id,
        title: v.title,
        destination: v.destination ?? null,
        start_date: v.start_date ?? null,
        end_date: v.end_date ?? null,
        timezone: v.timezone,
        summary: v.summary ?? null,
        share_token: null,
        share_enabled: false,
        share_can_edit: false,
      })
      .select('id')
      .single()

    if (error) throw error

    // 依日期區間建立天數；沒填日期就先給一天
    const dayCount =
      v.start_date && v.end_date
        ? (Date.parse(v.end_date) - Date.parse(v.start_date)) / 86_400_000 + 1
        : 1

    for (let i = 0; i < dayCount; i += 1) {
      const { error: dayErr } = await supabase.rpc('insert_trip_day', {
        p_trip_id: trip.id,
        p_after_index: null,
      })
      if (dayErr) throw dayErr
    }

    revalidatePath('/trips')
    return ok(trip.id)
  } catch (e) {
    return failFrom('createTrip', e)
  }
}

export async function updateTrip(
  tripId: string,
  input: TripInput,
): Promise<ActionResult> {
  try {
    const parsed = tripInputSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }
    const { supabase } = await assertOwnsTrip(tripId)
    const v = parsed.data

    const { error } = await supabase
      .from('trips')
      .update({
        title: v.title,
        destination: v.destination ?? null,
        timezone: v.timezone,
        summary: v.summary ?? null,
      })
      .eq('id', tripId)
    if (error) throw error

    // 日期變動會連帶增減天數，交給 RPC 一併處理
    const { error: dateErr } = await supabase.rpc('set_trip_dates', {
      p_trip_id: tripId,
      p_start_date: v.start_date ?? null,
      p_end_date: v.end_date ?? null,
    })
    if (dateErr) throw dateErr

    revalidatePath('/trips')
    revalidatePath(`/trips/${tripId}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('updateTrip', e)
  }
}

export async function deleteTrip(tripId: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertOwnsTrip(tripId)

    // DB cascade 會清掉 images 列，但 Storage 檔案要自己刪
    const { data: images } = await supabase
      .from('images')
      .select('path, thumb_path')
      .eq('trip_id', tripId)

    const { error } = await supabase.from('trips').delete().eq('id', tripId)
    if (error) throw error

    await removeStorageObjects(
      supabase,
      (images ?? []).flatMap((i) => [i.path, i.thumb_path]),
    )

    revalidatePath('/trips')
    return ok()
  } catch (e) {
    return failFrom('deleteTrip', e)
  }
}

// --------------------------------------------------------------- 天數 ----

export async function addTripDay(
  tripId: string,
  afterIndex: number | null,
): Promise<ActionResult> {
  try {
    const { supabase } = await assertOwnsTrip(tripId)
    const { error } = await supabase.rpc('insert_trip_day', {
      p_trip_id: tripId,
      p_after_index: afterIndex,
    })
    if (error) throw error
    revalidatePath(`/trips/${tripId}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('addTripDay', e)
  }
}

/** 刪除某天。該天的行程會退回儲備區，不會消失（由 delete_trip_day RPC 保證）。 */
export async function deleteTripDay(
  tripId: string,
  dayId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await assertOwnsTrip(tripId)
    const { error } = await supabase.rpc('delete_trip_day', {
      p_day_id: dayId,
    })
    if (error) {
      if (error.message.includes('at least one day')) {
        return fail('旅遊至少要保留一天')
      }
      throw error
    }
    revalidatePath(`/trips/${tripId}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('deleteTripDay', e)
  }
}

export async function updateTripDay(
  tripId: string,
  dayId: string,
  values: { title: string | null; note: string | null },
): Promise<ActionResult> {
  try {
    const { supabase } = await assertOwnsTrip(tripId)
    const { error } = await supabase
      .from('trip_days')
      .update({
        title: values.title?.trim() || null,
        note: values.note?.trim() || null,
      })
      .eq('id', dayId)
      .eq('trip_id', tripId)
    if (error) throw error
    revalidatePath(`/trips/${tripId}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('updateTripDay', e)
  }
}

// --------------------------------------------------------------- 分享 ----

export type ShareState = {
  token: string | null
  enabled: boolean
  canEdit: boolean
}

export async function updateShareSettings(
  tripId: string,
  values: { enabled: boolean; canEdit: boolean; regenerate?: boolean },
): Promise<ActionResult<ShareState>> {
  try {
    const { supabase } = await assertOwnsTrip(tripId)

    const { data: current, error: readErr } = await supabase
      .from('trips')
      .select('share_token')
      .eq('id', tripId)
      .single()
    if (readErr) throw readErr

    // 第一次開啟或按下「重新產生」時換 token，舊連結立刻失效
    const token =
      values.regenerate || (values.enabled && !current.share_token)
        ? newShareToken()
        : current.share_token

    const { error } = await supabase
      .from('trips')
      .update({
        share_token: token,
        share_enabled: values.enabled,
        // 關閉分享時一併關掉編輯權，避免下次開啟時沿用舊設定
        share_can_edit: values.enabled ? values.canEdit : false,
      })
      .eq('id', tripId)
    if (error) throw error

    revalidatePath(`/trips/${tripId}`, 'layout')
    return ok({
      token,
      enabled: values.enabled,
      canEdit: values.enabled ? values.canEdit : false,
    })
  } catch (e) {
    return failFrom('updateShareSettings', e)
  }
}
