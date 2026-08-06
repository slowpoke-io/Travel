import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Google OAuth 導回後的 code exchange。
 *
 * Supabase 會把使用者導向這裡並附上 `code`，我們用它換取 session cookie。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorDescription = searchParams.get('error_description')

  const rawNext = searchParams.get('next') ?? '/trips'
  // 只允許站內相對路徑，避免被拿來做 open redirect
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//')
    ? rawNext
    : '/trips'

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
