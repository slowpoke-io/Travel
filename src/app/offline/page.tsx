import { WifiOff } from 'lucide-react'

export const metadata = { title: '目前離線' }

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-8 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <WifiOff className="text-muted-foreground size-7" aria-hidden />
      </div>
      <h1 className="mt-5 text-lg font-semibold">目前沒有網路連線</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        已經瀏覽過的行程與圖片仍可查看。
        <br />
        新增或編輯需要連上網路才能儲存。
      </p>
    </main>
  )
}
