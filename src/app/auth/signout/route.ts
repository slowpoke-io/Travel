import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // 相對路徑：隧道或代理後面 request.url 會是 localhost，
  // 拿它組絕對網址會把使用者導到錯的地方（詳見 auth/callback/route.ts）
  return new NextResponse(null, {
    status: 303,
    headers: { Location: '/' },
  })
}
