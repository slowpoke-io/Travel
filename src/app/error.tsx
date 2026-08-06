'use client'

import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  // 環境變數沒設定是最常見的啟動問題，給出可直接照做的指示
  const isEnvIssue = error.message.includes('缺少環境變數')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-8 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <TriangleAlert className="text-muted-foreground size-7" aria-hidden />
      </div>
      <h1 className="mt-5 text-lg font-semibold">
        {isEnvIssue ? '尚未完成設定' : '發生了一點問題'}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {isEnvIssue
          ? error.message
          : '請稍後再試一次。如果一直出現，重新整理頁面通常會有幫助。'}
      </p>
      {!isEnvIssue ? (
        <Button onClick={reset} className="mt-6">
          再試一次
        </Button>
      ) : null}
    </main>
  )
}
