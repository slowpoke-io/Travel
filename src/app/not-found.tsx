import Link from 'next/link'
import { Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const metadata = { title: '找不到頁面' }

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-8 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <Compass className="text-muted-foreground size-7" aria-hidden />
      </div>
      <h1 className="mt-5 text-lg font-semibold">找不到這個頁面</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        這個連結可能已經失效，或分享已經被關閉。
      </p>
      <Button asChild className="mt-6">
        <Link href="/trips">回到我的旅遊</Link>
      </Button>
    </main>
  )
}
