import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { publicEnv } from '@/lib/env'

/**
 * Next.js 16 把 `middleware.ts` 更名為 `proxy.ts`。
 *
 * 這裡只做一件事：更新（refresh）Supabase 的 auth token 並把新 cookie 同時寫回
 * request（給下游 Server Component 讀）與 response（給瀏覽器）。
 *
 * 注意：這裡「不」做授權判斷。Server Action 可被直接 POST 觸發，不一定經過
 * proxy 的 matcher，因此每個 action 都必須自行驗權（見 src/lib/auth.ts）。
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
          // 帶有 auth cookie 的回應絕不能被 CDN 快取，
          // 否則某個使用者的 session token 可能被送給別人。
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value)
          }
        },
      },
    },
  )

  // 必須呼叫 getUser()（而非 getSession()）才會真的驗證並在需要時更新 token
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * 跳過靜態資源與圖片最佳化，其餘路徑都要更新 session：
     * - _next/static, _next/image
     * - favicon / manifest / service worker / 圖示等靜態檔
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
