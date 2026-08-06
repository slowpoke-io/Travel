'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Inbox, Map, Settings2 } from 'lucide-react'

import { useBasePath, useTripAccess } from '@/components/trip/trip-access'
import { cn } from '@/lib/utils'

/**
 * 旅遊內的底部導覽。手機優先，所有按鈕高度 ≥ 56px，
 * 並保留 iPhone home indicator 的安全區。
 */
export function BottomNav({ currentDayIndex }: { currentDayIndex: number }) {
  const pathname = usePathname()
  const base = useBasePath()
  const access = useTripAccess()

  const items = [
    {
      href: `${base}/d/${currentDayIndex}`,
      label: '行程',
      icon: CalendarDays,
      match: (p: string) => p.includes('/d/'),
    },
    {
      href: `${base}/backlog`,
      label: '儲備區',
      icon: Inbox,
      match: (p: string) => p.endsWith('/backlog'),
    },
    {
      href: `${base}/map`,
      label: '地圖',
      icon: Map,
      match: (p: string) => p.endsWith('/map'),
    },
    // 訪客沒有設定頁 —— 旅遊本體只有擁有者能改
    ...(access.mode === 'owner'
      ? [
          {
            href: `${base}/settings`,
            label: '設定',
            icon: Settings2,
            match: (p: string) => p.endsWith('/settings'),
          },
        ]
      : []),
  ]

  return (
    <nav className="bg-background/95 pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t backdrop-blur">
      <ul className="flex">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={label} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors',
                  active
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                <Icon
                  className={cn('size-5', active && 'stroke-[2.5]')}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
