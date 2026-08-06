'use server'

import { revalidatePath } from 'next/cache'

import { fail, failFrom, ok, type ActionResult } from '@/lib/action-result'
import * as core from '@/lib/mutations/activities'
import { removeStorageObjects } from '@/lib/mutations/images'
import * as tagCore from '@/lib/mutations/tags'
import {
  activityInputSchema,
  reorderSchema,
  tagInputSchema,
  type ActivityInput,
} from '@/lib/schemas'
import { requireShareEdit } from '@/lib/share/guard'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 分享連結（不用帳號）的可編輯白名單。
 *
 * 這個檔案「刻意」只有行程與標籤相關的函式 —— 沒有改旅遊名稱／日期、
 * 沒有新增刪除天數、沒有改分享設定、沒有刪除旅遊。訪客做不到那些事，
 * 是因為對應的 Server Action 根本不存在，而不是因為某個 if 判斷擋住了。
 *
 * 每個函式的第一件事都是 requireShareEdit(token)：
 *   - token 無效或分享已關閉 → 擋下
 *   - 擁有者把「允許編輯」關掉 → 立刻擋下（既有分頁也擋）
 *
 * tripId 一律取自驗證後的 share context，絕不從呼叫端參數取得，
 * 因此即使這裡用的是繞過 RLS 的 admin client，也寫不到別趟旅遊。
 */
async function guestContext(token: string) {
  const share = await requireShareEdit(token)
  return { tripId: share.trip.id, supabase: createAdminClient() }
}

function revalidateShare(token: string) {
  revalidatePath(`/s/${token}`, 'layout')
}

export async function guestCreateActivity(
  token: string,
  dayId: string | null,
  input: ActivityInput,
): Promise<ActionResult<string>> {
  try {
    const parsed = activityInputSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }
    const { tripId, supabase } = await guestContext(token)

    // 目標日必須屬於這趟旅遊
    if (dayId) {
      const { data } = await supabase
        .from('trip_days')
        .select('id')
        .eq('id', dayId)
        .eq('trip_id', tripId)
        .maybeSingle()
      if (!data) return fail('找不到指定的日期')
    }

    const id = await core.createActivity(supabase, {
      tripId,
      dayId,
      input: parsed.data,
      createdBy: null, // 匿名訪客沒有帳號
    })
    revalidateShare(token)
    return ok(id)
  } catch (e) {
    return failFrom('guestCreateActivity', e)
  }
}

export async function guestUpdateActivity(
  token: string,
  activityId: string,
  input: ActivityInput,
): Promise<ActionResult> {
  try {
    const parsed = activityInputSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }
    const { tripId, supabase } = await guestContext(token)
    await core.updateActivity(supabase, {
      tripId,
      activityId,
      input: parsed.data,
    })
    revalidateShare(token)
    return ok()
  } catch (e) {
    return failFrom('guestUpdateActivity', e)
  }
}

export async function guestDeleteActivity(
  token: string,
  activityId: string,
): Promise<ActionResult> {
  try {
    const { tripId, supabase } = await guestContext(token)
    const orphanPaths = await core.deleteActivity(supabase, {
      tripId,
      activityId,
    })
    await removeStorageObjects(supabase, orphanPaths)
    revalidateShare(token)
    return ok()
  } catch (e) {
    return failFrom('guestDeleteActivity', e)
  }
}

export async function guestReorderActivities(
  token: string,
  dayId: string | null,
  ids: string[],
): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.safeParse({ dayId, ids })
    if (!parsed.success) return fail('排序資料格式有誤')

    const { tripId, supabase } = await guestContext(token)

    if (parsed.data.dayId) {
      const { data } = await supabase
        .from('trip_days')
        .select('id')
        .eq('id', parsed.data.dayId)
        .eq('trip_id', tripId)
        .maybeSingle()
      if (!data) return fail('找不到指定的日期')
    }

    await core.reorderActivities(supabase, {
      tripId,
      dayId: parsed.data.dayId,
      ids: parsed.data.ids,
    })
    revalidateShare(token)
    return ok()
  } catch (e) {
    return failFrom('guestReorderActivities', e)
  }
}

export async function guestMoveActivities(
  token: string,
  activityIds: string[],
  targetDayId: string | null,
): Promise<ActionResult> {
  try {
    const { tripId, supabase } = await guestContext(token)

    if (targetDayId) {
      const { data } = await supabase
        .from('trip_days')
        .select('id')
        .eq('id', targetDayId)
        .eq('trip_id', tripId)
        .maybeSingle()
      if (!data) return fail('找不到指定的日期')
    }

    await core.moveActivities(supabase, { tripId, activityIds, targetDayId })
    revalidateShare(token)
    return ok()
  } catch (e) {
    return failFrom('guestMoveActivities', e)
  }
}

// --------------------------------------------------------------- 標籤 ----

export async function guestCreateTag(
  token: string,
  name: string,
  color: string,
): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  try {
    const parsed = tagInputSchema.safeParse({ name, color })
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '標籤格式有誤')
    }
    const { tripId, supabase } = await guestContext(token)
    const tag = await tagCore.createTag(supabase, {
      tripId,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    revalidateShare(token)
    return ok({ id: tag.id, name: tag.name, color: tag.color })
  } catch (e) {
    return failFrom('guestCreateTag', e)
  }
}
