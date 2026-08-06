import 'server-only'

import { customAlphabet } from 'nanoid'

import { createAdminClient } from '@/lib/supabase/admin'
import type { TripRow } from '@/lib/supabase/database.types'

/** 不含易混淆字元（0/O、1/l/I），方便口頭或手抄分享 */
const generateToken = customAlphabet(
  '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ',
  22,
)

export function newShareToken(): string {
  return generateToken()
}

export type ShareContext = {
  trip: TripRow
  /** 擁有者是否開啟了「不用帳號也能編輯」 */
  canEdit: boolean
}

/**
 * 驗證分享 token。
 *
 * 這是所有 /s/[token] 讀寫的唯一入口。找不到、或分享已關閉，一律回傳 null，
 * 呼叫端統一顯示 404 —— 不區分「token 不存在」與「分享已關閉」，避免洩漏
 * 某個 token 曾經有效的資訊。
 */
export async function resolveShare(
  token: string | undefined | null,
): Promise<ShareContext | null> {
  if (!token || token.length < 10 || token.length > 64) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('trips')
    .select('*')
    .eq('share_token', token)
    .eq('share_enabled', true)
    .maybeSingle()

  if (error || !data) return null
  return { trip: data, canEdit: data.share_can_edit }
}

/**
 * 分享連結的「可編輯」入口。
 *
 * actions/share/ 底下所有會寫入的 action 都必須先過這一關。
 * 擁有者把開關關掉之後，既有分頁再送出的請求會立刻被擋下。
 */
export async function requireShareEdit(token: string): Promise<ShareContext> {
  const share = await resolveShare(token)
  if (!share) throw new Error('SHARE_NOT_FOUND')
  if (!share.canEdit) throw new Error('SHARE_READ_ONLY')
  return share
}
