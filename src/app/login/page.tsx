import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getCurrentUser } from '@/lib/supabase/server'

import { GoogleSignInButton } from './google-sign-in-button'

export const metadata = { title: '登入' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  // 只接受站內相對路徑，避免登入後被導到外部網站
  const safeNext =
    next?.startsWith('/') && !next.startsWith('//') ? next : '/trips'

  const user = await getCurrentUser()
  if (user) redirect(safeNext)

  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-6">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mt-4 inline-flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        返回
      </Link>

      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-3xl font-bold tracking-tight">登入</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          用 Google 帳號登入，你的旅遊資料只有你自己看得到。
        </p>

        {error ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive mt-6 rounded-lg border px-4 py-3 text-sm"
          >
            登入沒有成功：{error}
          </p>
        ) : null}

        <div className="mt-8">
          <GoogleSignInButton next={safeNext} />
        </div>
      </div>

      <p className="text-muted-foreground pb-safe py-6 text-center text-xs leading-relaxed">
        登入即表示你同意我們儲存你的旅遊規劃資料。
        <br />
        你可以隨時刪除任何一趟旅遊。
      </p>
    </main>
  )
}
