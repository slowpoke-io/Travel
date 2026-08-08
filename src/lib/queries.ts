import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ActivityRow,
  Database,
  ExpenseRow,
  ImageRow,
  TagRow,
  TripDayRow,
  TripRow,
} from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

/** 行程 + 其標籤 id + 其圖片，供卡片與詳情頁使用 */
export type ActivityWithRelations = ActivityRow & {
  tagIds: string[]
  images: ImageRow[]
}

/** 花費 + 它的收據照片 */
export type ExpenseWithImages = ExpenseRow & { images: ImageRow[] }

export type TripBundle = {
  trip: TripRow
  days: TripDayRow[]
  activities: ActivityWithRelations[]
  tags: TagRow[]
  tripImages: ImageRow[]
  /**
   * 花費。分享連結且擁有者沒開放時是空陣列 —— 不是「查了但過濾掉」，
   * 而是根本不查（見 includeExpenses）。
   */
  expenses: ExpenseWithImages[]
}

/**
 * 一次抓完整趟旅遊。
 *
 * 單趟旅遊的資料量很小（幾十筆行程），一次抓完比讓每個頁面各自查詢更快，
 * 也讓「每日 / 儲備區 / 地圖」三個分頁切換時不需要重新往返資料庫。
 *
 * 這個函式對 client 的來源不做假設：擁有者路徑傳入受 RLS 保護的 client，
 * 分享路徑傳入已驗證過 token 的 admin client。
 */
export async function loadTripBundle(
  supabase: Client,
  tripId: string,
  options: {
    /**
     * 要不要一起讀花費。分享連結的訪客預設讀不到 ——
     * 這裡是「不發出查詢」而不是「查了再過濾」，少一次往返也少一個出錯的機會。
     */
    includeExpenses?: boolean
  } = {},
): Promise<TripBundle | null> {
  const { includeExpenses = true } = options

  const [tripRes, daysRes, activitiesRes, tagsRes, imagesRes, actTagsRes, expensesRes] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
      supabase
        .from('trip_days')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_index'),
      supabase
        .from('activities')
        .select('*')
        .eq('trip_id', tripId)
        .order('position'),
      supabase.from('tags').select('*').eq('trip_id', tripId).order('name'),
      supabase
        .from('images')
        .select('*')
        .eq('trip_id', tripId)
        .order('position'),
      supabase
        .from('activity_tags')
        .select('activity_id, tag_id, activities!inner(trip_id)')
        .eq('activities.trip_id', tripId),
      includeExpenses
        ? supabase
            .from('expenses')
            .select('*')
            .eq('trip_id', tripId)
            .order('spent_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
        : null,
    ])

  if (tripRes.error) throw tripRes.error
  if (!tripRes.data) return null

  for (const res of [daysRes, activitiesRes, tagsRes, imagesRes, actTagsRes]) {
    if (res.error) throw res.error
  }
  if (expensesRes?.error) throw expensesRes.error

  const tagsByActivity = new Map<string, string[]>()
  for (const row of (actTagsRes.data ?? []) as {
    activity_id: string
    tag_id: string
  }[]) {
    const list = tagsByActivity.get(row.activity_id)
    if (list) list.push(row.tag_id)
    else tagsByActivity.set(row.activity_id, [row.tag_id])
  }

  /*
    圖片分三類。判斷順序很重要：收據的 activity_id 也是 null，如果只用
    `!img.activity_id` 判斷「屬於整趟旅遊」，收據就會被算成旅遊層級的圖，
    跑到概覽的相簿裡。所以先看 expense_id。
  */
  const imagesByActivity = new Map<string, ImageRow[]>()
  const imagesByExpense = new Map<string, ImageRow[]>()
  const tripImages: ImageRow[] = []
  for (const img of imagesRes.data ?? []) {
    if (img.expense_id) {
      const list = imagesByExpense.get(img.expense_id)
      if (list) list.push(img)
      else imagesByExpense.set(img.expense_id, [img])
      continue
    }
    if (!img.activity_id) {
      tripImages.push(img)
      continue
    }
    const list = imagesByActivity.get(img.activity_id)
    if (list) list.push(img)
    else imagesByActivity.set(img.activity_id, [img])
  }

  const activities: ActivityWithRelations[] = (activitiesRes.data ?? []).map(
    (a) => ({
      ...a,
      tagIds: tagsByActivity.get(a.id) ?? [],
      images: imagesByActivity.get(a.id) ?? [],
    }),
  )

  const expenses: ExpenseWithImages[] = (expensesRes?.data ?? []).map((e) => ({
    ...e,
    images: imagesByExpense.get(e.id) ?? [],
  }))

  return {
    trip: tripRes.data,
    days: daysRes.data ?? [],
    activities,
    tags: tagsRes.data ?? [],
    tripImages,
    expenses,
  }
}

/** 旅遊列表：附上封面圖與行程數，避免列表頁 N+1 查詢 */
export type TripListItem = TripRow & {
  coverPath: string | null
  coverThumbPath: string | null
  activityCount: number
  dayCount: number
}

export async function loadTripList(
  supabase: Client,
  userId: string,
): Promise<TripListItem[]> {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('owner_id', userId)
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!trips?.length) return []

  const tripIds = trips.map((t) => t.id)

  const [coversRes, activitiesRes, daysRes] = await Promise.all([
    supabase
      .from('images')
      .select('trip_id, path, thumb_path')
      .in('trip_id', tripIds)
      .is('activity_id', null)
      .eq('role', 'cover'),
    supabase.from('activities').select('trip_id').in('trip_id', tripIds),
    supabase.from('trip_days').select('trip_id').in('trip_id', tripIds),
  ])

  const coverByTrip = new Map(
    (coversRes.data ?? []).map((c) => [c.trip_id, c] as const),
  )
  const countBy = (rows: { trip_id: string }[] | null) => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) m.set(r.trip_id, (m.get(r.trip_id) ?? 0) + 1)
    return m
  }
  const activityCounts = countBy(activitiesRes.data)
  const dayCounts = countBy(daysRes.data)

  return trips.map((t) => ({
    ...t,
    coverPath: coverByTrip.get(t.id)?.path ?? null,
    coverThumbPath: coverByTrip.get(t.id)?.thumb_path ?? null,
    activityCount: activityCounts.get(t.id) ?? 0,
    dayCount: dayCounts.get(t.id) ?? 0,
  }))
}
