'use server'

import { revalidatePath } from 'next/cache'

import { failFrom, ok, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import * as core from '@/lib/mutations/images'
import { createClient } from '@/lib/supabase/server'
import type { ImageRole } from '@/lib/supabase/database.types'

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

export async function requestUploadSlots(
  tripId: string,
  count: number,
): Promise<ActionResult<core.UploadSlot[]>> {
  try {
    const { supabase } = await ownerContext(tripId)
    const slots = await core.createUploadSlots(supabase, { tripId, count })
    return ok(slots)
  } catch (e) {
    return failFrom('requestUploadSlots', e)
  }
}

export async function commitImages(
  tripId: string,
  activityId: string | null,
  images: core.CommitImageInput[],
): Promise<ActionResult> {
  try {
    const { user, supabase } = await ownerContext(tripId)
    await core.commitImages(supabase, {
      tripId,
      activityId,
      images,
      createdBy: user.id,
    })
    revalidatePath(`/trips/${tripId}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('commitImages', e)
  }
}

export async function deleteImage(
  tripId: string,
  imageId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await ownerContext(tripId)
    await core.deleteImage(supabase, { tripId, imageId })
    revalidatePath(`/trips/${tripId}`, 'layout')
    revalidatePath('/trips')
    return ok()
  } catch (e) {
    return failFrom('deleteImage', e)
  }
}

export async function setCoverImage(
  tripId: string,
  imageId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await ownerContext(tripId)
    await core.setCoverImage(supabase, { tripId, imageId })
    revalidatePath(`/trips/${tripId}`, 'layout')
    revalidatePath('/trips')
    return ok()
  } catch (e) {
    return failFrom('setCoverImage', e)
  }
}

export async function updateImageRole(
  tripId: string,
  imageId: string,
  role: ImageRole,
): Promise<ActionResult> {
  try {
    const { supabase } = await ownerContext(tripId)
    if (role === 'cover') {
      await core.setCoverImage(supabase, { tripId, imageId })
    } else {
      const { error } = await supabase
        .from('images')
        .update({ role })
        .eq('id', imageId)
        .eq('trip_id', tripId)
      if (error) throw error
    }
    revalidatePath(`/trips/${tripId}`, 'layout')
    return ok()
  } catch (e) {
    return failFrom('updateImageRole', e)
  }
}
