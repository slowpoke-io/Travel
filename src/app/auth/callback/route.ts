import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Google OAuth 導回後的 code exchange。
 *
 * Supabase 會把使用者導向這裡並附上 `code`，我們用它換取 session cookie。
 *
 * 導回時一律使用「相對路徑」的 Location header。
 * 原因有兩個：
 *  1. 隧道（localtunnel / ngrok）或反向代理後面，`request.url` 看到的是
 *     http://localhost:3000，直接拿它組絕對網址會把手機導去 localhost 而失敗。
 *  2. 改用 x-forwarded-host 之類的標頭雖然能解決 1，但那些標頭可被偽造，
 *     會變成 open redirect。相對路徑由瀏覽器自己解析成當前來源，兩個問題一次解決。
 */
function redirectTo(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorDescription = searchParams.get('error_description')

  const rawNext = searchParams.get('next') ?? '/trips'
  // 只允許站內相對路徑，避免被拿來做 open redirect
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/trips'

  if (errorDescription) {
    return redirectTo(`/login?error=${encodeURIComponent(errorDescription)}`)
  }

  if (!code) {
    return redirectTo('/login?error=missing_code')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return redirectTo(`/login?error=${encodeURIComponent(error.message)}`)
  }

  return redirectTo(next)
}
