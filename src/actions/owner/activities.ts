'use server'

import { revalidatePath } from 'next/cache'

import { fail, failFrom, ok, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import * as core from '@/lib/mutations/activities'
import { removeStorageObjects } from '@/lib/mutations/images'
import * as tagCore from '@/lib/mutations/tags'
import {
  activityInputSchema,
  reorderSchema,
  tagInputSchema,
  type ActivityInput,
} from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

/**
 * 擁有者的行程操作。授權方式：requireUser() + RLS。
 * 對應的訪客版本在 actions/share/activities.ts。
 */
async function ownerContext(tripId: string) {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('TRIP_NOT_FOUND')

  return { user, supabase }
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/trips/${tripId}`, 'layout')
}

export async function createActivity(
  tripId: string,
  dayId: string | null,
  input: ActivityInput,
): Promise<ActionResult<string>> {
  try {
    const parsed = activityInputSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }
    const { user, supabase } = await ownerContext(tripId)
    const id = await core.createActivity(supabase, {
      tripId,
      dayId,
      input: parsed.data,
      createdBy: user.id,
    })
    revalidateTrip(tripId)
    return ok(id)
  } catch (e) {
    return failFrom('createActivity', e)
  }
}

export async function updateActivity(
  tripId: string,
  activityId: string,
  input: ActivityInput,
): Promise<ActionResult> {
  try {
    const parsed = activityInputSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }
    const { supabase } = await ownerContext(tripId)
    await core.updateActivity(supabase, {
      tripId,
      activityId,
      input: parsed.data,
    })
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('updateActivity', e)
  }
}

export async function deleteActivity(
  tripId: string,
  activityId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await ownerContext(tripId)
    const orphanPaths = await core.deleteActivity(supabase, {
      tripId,
      activityId,
    })
    await removeStorageObjects(supabase, orphanPaths)
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('deleteActivity', e)
  }
}

export async function reorderActivities(
  tripId: string,
  dayId: string | null,
  ids: string[],
): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.safeParse({ dayId, ids })
    if (!parsed.success) return fail('排序資料格式有誤')

    const { supabase } = await ownerContext(tripId)
    await core.reorderActivities(supabase, {
      tripId,
      dayId: parsed.data.dayId,
      ids: parsed.data.ids,
    })
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('reorderActivities', e)
  }
}

export async function moveActivities(
  tripId: string,
  activityIds: string[],
  targetDayId: string | null,
): Promise<ActionResult> {
  try {
    const { supabase } = await ownerContext(tripId)
    await core.moveActivities(supabase, { tripId, activityIds, targetDayId })
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('moveActivities', e)
  }
}

// --------------------------------------------------------------- 標籤 ----

export async function createTag(
  tripId: string,
  name: string,
  color: string,
): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  try {
    const parsed = tagInputSchema.safeParse({ name, color })
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '標籤格式有誤')
    }
    const { supabase } = await ownerContext(tripId)
    const tag = await tagCore.createTag(supabase, {
      tripId,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    revalidateTrip(tripId)
    return ok({ id: tag.id, name: tag.name, color: tag.color })
  } catch (e) {
    return failFrom('createTag', e)
  }
}

export async function deleteTag(
  tripId: string,
  tagId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await ownerContext(tripId)
    await tagCore.deleteTag(supabase, { tripId, tagId })
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('deleteTag', e)
  }
}

export async function renameTag(
  tripId: string,
  tagId: string,
  name: string,
  color: string,
): Promise<ActionResult> {
  try {
    const parsed = tagInputSchema.safeParse({ name, color })
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '標籤格式有誤')
    }
    const { supabase } = await ownerContext(tripId)
    await tagCore.renameTag(supabase, {
      tripId,
      tagId,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('renameTag', e)
  }
}
