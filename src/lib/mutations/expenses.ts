import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { emptyToNull, type ExpenseInput } from '@/lib/schemas'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

/**
 * 花費異動的核心邏輯。
 *
 * 跟 mutations/activities.ts 一樣不做授權判斷 —— 由呼叫端負責，
 * 而且每個函式都以 tripId 明確過濾，即使拿到 admin client 也寫不到別趟旅遊。
 */

function toRow(input: ExpenseInput) {
  return {
    title: emptyToNull(input.title ?? null),
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    rate: input.rate,
    spent_at: input.spent_at ?? null,
    note: emptyToNull(input.note ?? null),
  }
}

/**
 * day_id 與 activity_id 都要確認屬於同一趟旅遊。
 *
 * 資料庫的複合外鍵其實已經擋住了，但那會回傳一段看不懂的 constraint 錯誤。
 * 這裡先擋一次，使用者才看得到有意義的訊息。
 */
async function resolveLinks(
  client: Client,
  tripId: string,
  input: ExpenseInput,
): Promise<{ day_id: string | null; activity_id: string | null }> {
  const dayId = input.day_id ?? null
  const activityId = input.activity_id ?? null

  if (dayId) {
    const { data, error } = await client
      .from('trip_days')
      .select('id')
      .eq('id', dayId)
      .eq('trip_id', tripId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('DAY_NOT_IN_TRIP')
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

  return { day_id: dayId, activity_id: activityId }
}

export async function createExpense(
  client: Client,
  params: { tripId: string; input: ExpenseInput; createdBy: string | null },
): Promise<string> {
  const { tripId, input, createdBy } = params
  const links = await resolveLinks(client, tripId, input)

  const { data, error } = await client
    .from('expenses')
    .insert({
      trip_id: tripId,
      created_by: createdBy,
      ...links,
      ...toRow(input),
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

export async function updateExpense(
  client: Client,
  params: { tripId: string; expenseId: string; input: ExpenseInput },
): Promise<void> {
  const { tripId, expenseId, input } = params
  const links = await resolveLinks(client, tripId, input)

  const { error } = await client
    .from('expenses')
    .update({ ...links, ...toRow(input) })
    .eq('id', expenseId)
    .eq('trip_id', tripId)

  if (error) throw error
}

/**
 * 刪除花費，回傳它的圖片檔案路徑讓呼叫端去刪 Storage。
 *
 * 順序跟刪行程一樣重要：資料列一刪，images 會被 cascade 帶走，
 * 之後就查不到 path，檔案會永遠留在 bucket 裡。所以先查再刪。
 */
export async function deleteExpense(
  client: Client,
  params: { tripId: string; expenseId: string },
): Promise<(string | null)[]> {
  const { tripId, expenseId } = params

  const { data: images, error: imgErr } = await client
    .from('images')
    .select('path, thumb_path')
    .eq('trip_id', tripId)
    .eq('expense_id', expenseId)
  if (imgErr) throw imgErr

  const paths = (images ?? []).flatMap((i) => [i.path, i.thumb_path])

  const { error } = await client
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('trip_id', tripId)
  if (error) throw error

  return paths
}
