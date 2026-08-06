import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Server Component / Server Action / Route Handler 用的 client。
 * RLS 以登入使用者身分生效。
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // 從 Server Component 呼叫時無法寫 cookie。
            // proxy.ts 已負責更新 session，這裡忽略即可。
          }
        },
      },
    },
  )
}

/** 取得目前登入使用者，未登入回傳 null。 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
