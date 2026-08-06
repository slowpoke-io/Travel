import 'server-only'

import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

/**
 * 頁面用：未登入直接導向登入頁。
 */
export async function requireUserOrRedirect(nextPath?: string): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const target = nextPath
      ? `/login?next=${encodeURIComponent(nextPath)}`
      : '/login'
    redirect(target)
  }
  return user
}

/**
 * Server Action 用：未登入丟錯。
 *
 * Server Action 會以 POST 直接暴露在網路上，不保證經過 proxy.ts 的 matcher，
 * 所以每個需要授權的 action 都必須自己呼叫這個函式。
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('UNAUTHENTICATED')
  }
  return user
}
