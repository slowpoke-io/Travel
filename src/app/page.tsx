import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays, GripVertical, ImageIcon, MapPinned } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/supabase/server'

const FEATURES = [
  {
    icon: CalendarDays,
    title: '行程儲備區',
    body: '想去的地方先丟進儲備區，之後一鍵指派到任何一天。',
  },
  {
    icon: GripVertical,
    title: '手機拖曳排序',
    body: '打開排序模式，當天行程縮成單行，單手就能調整順序。',
  },
  {
    icon: MapPinned,
    title: '地圖看順序',
    body: '每天的行程在地圖上依序標號連線，一眼看出動線順不順。',
  },
  {
    icon: ImageIcon,
    title: '照片紀錄',
    body: '票券、菜單、回憶照片分開收納，還能設成行程封面。',
  },
]

export default async function LandingPage() {
  const user = await getCurrentUser()
  if (user) redirect('/trips')

  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-6">
      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="text-muted-foreground text-sm font-medium">
          旅遊規劃與紀錄
        </p>
        <h1 className="mt-2 text-4xl leading-tight font-bold tracking-tight">
          把想去的地方，
          <br />
          排成一趟旅程。
        </h1>
        <p className="text-muted-foreground mt-4 text-base leading-relaxed">
          專為手機設計。規劃時排行程，旅行中看地圖，回來後留下照片紀錄 ——
          都在同一個地方。
        </p>

        <ul className="mt-10 space-y-5">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="pb-safe sticky bottom-0 space-y-3 py-6">
        <Button asChild size="lg" className="h-12 w-full text-base">
          <Link href="/login">開始使用</Link>
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          使用 Google 帳號登入，即可建立第一趟旅遊
        </p>
      </div>
    </main>
  )
}
