'use server'

import { revalidatePath } from 'next/cache'

import { failFrom, ok, type ActionResult } from '@/lib/action-result'
import * as core from '@/lib/mutations/images'
import { requireShareEdit } from '@/lib/share/guard'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 分享連結的圖片白名單：可上傳、刪除、設封面。
 * 一樣沒有任何會動到旅遊本體的函式。
 */
async function guestContext(token: string) {
  const share = await requireShareEdit(token)
  return { tripId: share.trip.id, supabase: createAdminClient() }
}

export async function guestRequestUploadSlots(
  token: string,
  count: number,
): Promise<ActionResult<core.UploadSlot[]>> {
  try {
    const { tripId, supabase } = await guestContext(token)
    const slots = await core.createUploadSlots(supabase, { tripId, count })
    return ok(slots)
  } catch (e) {
    return failFrom('guestRequestUploadSlots', e)
  }
}

export async function guestCommitImages(
  token: string,
  activityId: string | null,
  images: core.CommitImageInput[],
): Promise<ActionResult> {
  try {
    const { tripId, supabase } = await guestContext(token)
    await core.commitImages(supabase, {
      tripId,
      activityId,
      images,
      createdBy: null,
    })
    revalidatePath(`/s/${token}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('guestCommitImages', e)
  }
}

export async function guestDeleteImage(
  token: string,
  imageId: string,
): Promise<ActionResult> {
  try {
    const { tripId, supabase } = await guestContext(token)
    await core.deleteImage(supabase, { tripId, imageId })
    revalidatePath(`/s/${token}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('guestDeleteImage', e)
  }
}

export async function guestSetCoverImage(
  token: string,
  imageId: string,
): Promise<ActionResult> {
  try {
    const { tripId, supabase } = await guestContext(token)
    await core.setCoverImage(supabase, { tripId, imageId })
    revalidatePath(`/s/${token}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('guestSetCoverImage', e)
  }
}
