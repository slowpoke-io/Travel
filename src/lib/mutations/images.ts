import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { STORAGE_BUCKET } from '@/lib/constants'
import type { Database, ImageRole } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export type UploadSlot = {
  /** 主圖路徑：{trip_id}/{uuid}.webp */
  path: string
  /** 縮圖路徑：{trip_id}/{uuid}_t.webp */
  thumbPath: string
  /** 直傳用的簽名 URL 與 token */
  pathToken: string
  thumbToken: string
}

/**
 * 產生直傳用的簽名上傳 URL。
 *
 * 圖片由瀏覽器直接 PUT 到 Storage，不經過 Next.js server —— 手機上傳快、省頻寬。
 * 擁有者與分享連結的匿名訪客走同一條路徑，差別只在呼叫端的授權判斷。
 */
export async function createUploadSlots(
  client: Client,
  params: { tripId: string; count: number },
): Promise<UploadSlot[]> {
  const count = Math.min(Math.max(params.count, 1), 10)
  const slots: UploadSlot[] = []

  for (let i = 0; i < count; i += 1) {
    const id = crypto.randomUUID()
    const path = `${params.tripId}/${id}.webp`
    const thumbPath = `${params.tripId}/${id}_t.webp`

    const [main, thumb] = await Promise.all([
      client.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path),
      client.storage.from(STORAGE_BUCKET).createSignedUploadUrl(thumbPath),
    ])

    if (main.error) throw main.error
    if (thumb.error) throw thumb.error

    slots.push({
      path,
      thumbPath,
      pathToken: main.data.token,
      thumbToken: thumb.data.token,
    })
  }

  return slots
}

export type CommitImageInput = {
  path: string
  thumbPath: string | null
  role: ImageRole
  width: number | null
  height: number | null
  bytes: number | null
  mime: string | null
  caption?: string | null
}

/**
 * 上傳完成後把圖片寫入資料表。
 *
 * 路徑一定要以 tripId 開頭 —— 這同時是 storage RLS policy 的依據，
 * 也擋掉「宣稱上傳到別人的旅遊」這種偽造。
 */
export async function commitImages(
  client: Client,
  params: {
    tripId: string
    activityId: string | null
    images: CommitImageInput[]
    createdBy: string | null
  },
): Promise<void> {
  const { tripId, activityId, images, createdBy } = params
  if (!images.length) return

  for (const img of images) {
    if (!img.path.startsWith(`${tripId}/`)) {
      throw new Error('IMAGE_PATH_OUTSIDE_TRIP')
    }
    if (img.thumbPath && !img.thumbPath.startsWith(`${tripId}/`)) {
      throw new Error('IMAGE_PATH_OUTSIDE_TRIP')
    }
  }

  if (activityId) {
    const { data, error } = await client
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .eq('trip_id', tripId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('ACTIVITY_NOT_IN_TRIP')
  }

  // 接在既有相簿後面
  const existing = client
    .from('images')
    .select('position')
    .eq('trip_id', tripId)
    .order('position', { ascending: false })
    .limit(1)

  const { data: last } = await (
    activityId
      ? existing.eq('activity_id', activityId)
      : existing.is('activity_id', null)
  ).maybeSingle()

  let position = last ? last.position + 1 : 0

  const rows = images.map((img) => ({
    trip_id: tripId,
    activity_id: activityId,
    role: img.role,
    path: img.path,
    thumb_path: img.thumbPath,
    caption: img.caption ?? null,
    width: img.width,
    height: img.height,
    bytes: img.bytes,
    mime: img.mime,
    position: position++,
    taken_at: null,
    created_by: createdBy,
  }))

  const { error } = await client.from('images').insert(rows)
  if (error) throw error
}

export async function deleteImage(
  client: Client,
  params: { tripId: string; imageId: string },
): Promise<void> {
  const { data: image, error } = await client
    .from('images')
    .select('path, thumb_path')
    .eq('id', params.imageId)
    .eq('trip_id', params.tripId)
    .maybeSingle()

  if (error) throw error
  if (!image) throw new Error('IMAGE_NOT_FOUND')

  // 先刪檔案再刪資料列：反過來的話檔案會變成沒人指向的孤兒
  await removeStorageObjects(client, [image.path, image.thumb_path])

  const { error: delErr } = await client
    .from('images')
    .delete()
    .eq('id', params.imageId)
    .eq('trip_id', params.tripId)
  if (delErr) throw delErr
}

export async function setCoverImage(
  client: Client,
  params: { tripId: string; imageId: string },
): Promise<void> {
  const { data, error } = await client
    .from('images')
    .select('id')
    .eq('id', params.imageId)
    .eq('trip_id', params.tripId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('IMAGE_NOT_FOUND')

  const { error: rpcErr } = await client.rpc('set_cover_image', {
    p_image_id: params.imageId,
  })
  if (rpcErr) throw rpcErr
}

/**
 * 刪除 Storage 物件；失敗只記錄不中斷，孤兒檔案由清理腳本處理。
 *
 * 注意 storage.remove() 在被 RLS 擋下時「不會回傳錯誤」，只會回一個空陣列
 * （它先 SELECT 找出物件再刪，找不到就等於沒事做）。所以這裡必須比對
 * 實際刪除的筆數，否則檔案沒刪掉也完全看不出來。
 */
export async function removeStorageObjects(
  client: Client,
  paths: (string | null | undefined)[],
): Promise<void> {
  const valid = paths.filter((p): p is string => Boolean(p))
  if (!valid.length) return

  let removed = 0
  // 單次請求的筆數有上限，一趟旅遊的圖片可能很多
  const BATCH = 100
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH)
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .remove(batch)

    if (error) {
      console.error('[storage.remove] 刪除檔案失敗（將由清理腳本處理）', {
        paths: batch,
        error,
      })
      continue
    }
    removed += data?.length ?? 0
  }

  if (removed < valid.length) {
    console.error(
      '[storage.remove] 實際刪除筆數少於預期。最常見的原因是 storage.objects ' +
        '的 RLS 擋下了操作 —— policy 用 is_trip_owner(trip_id) 判定，' +
        '所以「trips 那一列已經被刪掉之後」再來刪檔案一定會失敗。' +
        '刪檔案務必排在刪資料列之前。' +
        '這些檔案已成孤兒，可用 scripts/cleanup-orphan-media.ts 清理。',
      { expected: valid.length, removed, paths: valid },
    )
  }
}

/**
 * 刪除整趟旅遊，連同它的所有圖片檔案。
 *
 * **順序很重要，而且不可對調。** storage.objects 的 RLS policy 是
 * `is_trip_owner((storage.foldername(name))[1]::uuid)` —— 它查的是 trips 表。
 * 一旦 trips 那一列被刪掉，policy 就再也判定不出擁有者，remove() 會靜默地
 * 刪掉 0 筆（它在被 RLS 擋下時不回傳錯誤），檔案全部變成孤兒。
 *
 * 所以：先刪 Storage 的檔案，最後才刪 trips 那一列。
 * images 資料列會隨著 trips 一起 cascade 消失，不需要另外處理。
 */
export async function deleteTripWithMedia(
  client: Client,
  tripId: string,
): Promise<void> {
  const { data: images, error: readErr } = await client
    .from('images')
    .select('path, thumb_path')
    .eq('trip_id', tripId)
  if (readErr) throw readErr

  await removeStorageObjects(
    client,
    (images ?? []).flatMap((i) => [i.path, i.thumb_path]),
  )

  const { error } = await client.from('trips').delete().eq('id', tripId)
  if (error) throw error
}
