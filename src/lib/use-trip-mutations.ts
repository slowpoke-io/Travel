'use client'

import { useMemo } from 'react'

import {
  createActivity as ownerCreateActivity,
  createTag as ownerCreateTag,
  deleteActivity as ownerDeleteActivity,
  moveActivities as ownerMoveActivities,
  reorderActivities as ownerReorderActivities,
  updateActivity as ownerUpdateActivity,
} from '@/actions/owner/activities'
import {
  commitImages as ownerCommitImages,
  deleteImage as ownerDeleteImage,
  discardPendingUploads as ownerDiscardPendingUploads,
  requestUploadSlots as ownerRequestUploadSlots,
  setCoverImage as ownerSetCoverImage,
} from '@/actions/owner/images'
import {
  guestCreateActivity,
  guestCreateTag,
  guestDeleteActivity,
  guestMoveActivities,
  guestReorderActivities,
  guestUpdateActivity,
} from '@/actions/share/activities'
import {
  guestCommitImages,
  guestDeleteImage,
  guestDiscardPendingUploads,
  guestRequestUploadSlots,
  guestSetCoverImage,
} from '@/actions/share/images'
import { useTripAccess } from '@/components/trip/trip-access'
import { fail, type ActionResult } from '@/lib/action-result'
import type { CommitImageInput, UploadSlot } from '@/lib/mutations/images'
import type { ActivityInput } from '@/lib/schemas'

const READ_ONLY = fail('這是唯讀的分享連結，無法編輯')

/**
 * 依照目前的存取模式，把 UI 的操作分派到擁有者或訪客版本的 Server Action。
 *
 * UI 元件只呼叫這一層，不需要知道自己在 /trips 還是 /s 底下。
 * `canEdit === false` 時直接回傳錯誤，不會發出任何請求 —— 不過真正的
 * 授權判斷仍在 server 端（每個 action 都會重新驗一次）。
 */
export function useTripMutations() {
  const access = useTripAccess()

  return useMemo(() => {
    const { mode, tripId, shareToken, canEdit } = access

    const guard = <A extends unknown[], R>(
      fn: (...args: A) => Promise<ActionResult<R>>,
    ) => {
      return async (...args: A): Promise<ActionResult<R>> =>
        canEdit ? fn(...args) : (READ_ONLY as ActionResult<R>)
    }

    if (mode === 'owner') {
      return {
        createActivity: guard((dayId: string | null, input: ActivityInput) =>
          ownerCreateActivity(tripId, dayId, input),
        ),
        updateActivity: guard((activityId: string, input: ActivityInput) =>
          ownerUpdateActivity(tripId, activityId, input),
        ),
        deleteActivity: guard((activityId: string) =>
          ownerDeleteActivity(tripId, activityId),
        ),
        reorderActivities: guard((dayId: string | null, ids: string[]) =>
          ownerReorderActivities(tripId, dayId, ids),
        ),
        moveActivities: guard((ids: string[], targetDayId: string | null) =>
          ownerMoveActivities(tripId, ids, targetDayId),
        ),
        createTag: guard((name: string, color: string) =>
          ownerCreateTag(tripId, name, color),
        ),
        requestUploadSlots: guard(
          (count: number): Promise<ActionResult<UploadSlot[]>> =>
            ownerRequestUploadSlots(tripId, count),
        ),
        commitImages: guard(
          (activityId: string | null, images: CommitImageInput[]) =>
            ownerCommitImages(tripId, activityId, images),
        ),
        deleteImage: guard((imageId: string) =>
          ownerDeleteImage(tripId, imageId),
        ),
        setCoverImage: guard((imageId: string) =>
          ownerSetCoverImage(tripId, imageId),
        ),
        discardPendingUploads: guard((paths: string[]) =>
          ownerDiscardPendingUploads(tripId, paths),
        ),
      }
    }

    const token = shareToken ?? ''
    return {
      createActivity: guard((dayId: string | null, input: ActivityInput) =>
        guestCreateActivity(token, dayId, input),
      ),
      updateActivity: guard((activityId: string, input: ActivityInput) =>
        guestUpdateActivity(token, activityId, input),
      ),
      deleteActivity: guard((activityId: string) =>
        guestDeleteActivity(token, activityId),
      ),
      reorderActivities: guard((dayId: string | null, ids: string[]) =>
        guestReorderActivities(token, dayId, ids),
      ),
      moveActivities: guard((ids: string[], targetDayId: string | null) =>
        guestMoveActivities(token, ids, targetDayId),
      ),
      createTag: guard((name: string, color: string) =>
        guestCreateTag(token, name, color),
      ),
      requestUploadSlots: guard(
        (count: number): Promise<ActionResult<UploadSlot[]>> =>
          guestRequestUploadSlots(token, count),
      ),
      commitImages: guard(
        (activityId: string | null, images: CommitImageInput[]) =>
          guestCommitImages(token, activityId, images),
      ),
      deleteImage: guard((imageId: string) => guestDeleteImage(token, imageId)),
      setCoverImage: guard((imageId: string) =>
        guestSetCoverImage(token, imageId),
      ),
      discardPendingUploads: guard((paths: string[]) =>
        guestDiscardPendingUploads(token, paths),
      ),
    }
  }, [access])
}

export type TripMutations = ReturnType<typeof useTripMutations>
