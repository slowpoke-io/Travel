import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, TagRow } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

/** 建立標籤；同名已存在時直接回傳既有的那個 */
export async function createTag(
  client: Client,
  params: { tripId: string; name: string; color: string },
): Promise<TagRow> {
  const { data: existing } = await client
    .from('tags')
    .select('*')
    .eq('trip_id', params.tripId)
    .eq('name', params.name)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await client
    .from('tags')
    .insert({
      trip_id: params.tripId,
      name: params.name,
      color: params.color,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteTag(
  client: Client,
  params: { tripId: string; tagId: string },
): Promise<void> {
  const { error } = await client
    .from('tags')
    .delete()
    .eq('id', params.tagId)
    .eq('trip_id', params.tripId)
  if (error) throw error
}

export async function renameTag(
  client: Client,
  params: { tripId: string; tagId: string; name: string; color: string },
): Promise<void> {
  const { error } = await client
    .from('tags')
    .update({ name: params.name, color: params.color })
    .eq('id', params.tagId)
    .eq('trip_id', params.tripId)
  if (error) throw error
}
