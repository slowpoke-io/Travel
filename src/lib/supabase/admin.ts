import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { getServiceRoleKey, publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Service role client —— 繞過 RLS。
 *
 * 只有一個合法用途：分享連結（/s/[token]）。匿名訪客沒有 Supabase session，
 * 無法靠 RLS 授權，因此由 server 端先驗證 share token（見 src/lib/share/guard.ts），
 * 確認通過後才用這個 client 操作，且操作範圍限縮在 actions/share/ 底下的白名單。
 *
 * `server-only` 保證這個模組一旦被 client component 引入就會在編譯期報錯。
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.supabaseUrl,
    getServiceRoleKey(),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
