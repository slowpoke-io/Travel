'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
      />
    </svg>
  )
}

export function GoogleSignInButton({ next }: { next: string }) {
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    const supabase = createClient()

    // 導回自家的 /auth/callback，由它把 code 換成 session cookie
    const redirectTo = new URL('/auth/callback', window.location.origin)
    redirectTo.searchParams.set('next', next)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: { prompt: 'select_account' },
      },
    })

    if (error) {
      setLoading(false)
      toast.error('登入失敗', { description: error.message })
    }
    // 成功時瀏覽器會被導走，不需要復位 loading
  }

  return (
    <Button
      onClick={signIn}
      disabled={loading}
      size="lg"
      variant="outline"
      className="h-12 w-full gap-3 text-base"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <GoogleMark />
      )}
      {loading ? '前往 Google…' : '用 Google 繼續'}
    </Button>
  )
}
