import { createBrowserClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/** 瀏覽器端 Supabase client（RLS 以登入使用者身分生效） */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  )
}
