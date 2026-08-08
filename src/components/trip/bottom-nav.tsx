'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, Inbox, Map, Wallet } from 'lucide-react'

import { useBasePath } from '@/components/trip/trip-access'
import {
  pushTripView,
  tripViewFromPathname,
  tripViewHref,
  type TripTab,
  type TripView,
} from '@/lib/trip-nav'
import { cn } from '@/lib/utils'

/**
 * 旅遊內的底部導覽。手機優先，所有按鈕高度 ≥ 56px，
 * 並保留 iPhone home indicator 的安全區。
 */
export function BottomNav({ showExpenses }: { showExpenses: boolean }) {
  const pathname = usePathname()
  const base = useBasePath()

  const current = tripViewFromPathname(pathname)

  /*
    只有「已經在三個分頁的路由上」才能用 pushState 切換 —— 那時候
    TripTabs 已經掛好了，改網址它就會換渲染哪個 view。

    在設定頁、概覽頁、行程詳情頁時掛的是別的路由，光改網址畫面不會動
    （按了完全沒反應），這種情況必須走 Next 的導航把 TripTabs 帶進來。
  */
  const inTabRoute = isTabRoute(pathname)

  /*
    記住最後看的是第幾天，從儲備區或地圖點回「行程」時才會回到原本那天，
    而不是每次都跳回 Day 1。

    切分頁不會重新掛載這個元件（只是 pushState），所以這個狀態留得住；
    真的導航進來時則由網址決定初始值。
  */
  const [lastDayIndex, setLastDayIndex] = useState(
    current.tab === 'day' ? current.dayIndex : 1,
  )
  if (current.tab === 'day' && current.dayIndex !== lastDayIndex) {
    setLastDayIndex(current.dayIndex)
  }

  const tabs: { tab: TripTab; view: TripView; label: string; icon: typeof Map }[] =
    [
      {
        tab: 'day',
        view: { tab: 'day', dayIndex: lastDayIndex },
        label: '行程',
        icon: CalendarDays,
      },
      { tab: 'backlog', view: { tab: 'backlog' }, label: '儲備區', icon: Inbox },
      { tab: 'map', view: { tab: 'map' }, label: '地圖', icon: Map },
      // 訪客看不看得到花費由擁有者逐趟決定；看不到時連分頁都不顯示
      ...(showExpenses
        ? [
            {
              tab: 'expense' as const,
              view: { tab: 'expense' as const },
              label: '花費',
              icon: Wallet,
            },
          ]
        : []),
    ]

  const onSettings = pathname.endsWith('/settings')

  return (
    <nav className="bg-background/95 pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t backdrop-blur">
      <ul className="flex">
        {tabs.map(({ tab, view, label, icon: Icon }) => {
          // 在設定頁或行程詳情頁時，所有分頁都不該亮
          const active = !onSettings && inTabRoute && current.tab === tab
          return (
            <li key={tab} className="flex-1">
              {/*
                已經在分頁路由上時攔下點擊改用 pushState —— 資料都在手上了，
                走導航只會讓伺服器把同樣的查詢重跑一次，換來一段空白。
                不在分頁路由上時就讓 Link 正常導航，順便預取。
              */}
              <Link
                href={tripViewHref(base, view)}
                prefetch={!inTabRoute}
                onClick={(e) => {
                  if (!inTabRoute) return
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                  e.preventDefault()
                  pushTripView(base, view)
                }}
                aria-current={active ? 'page' : undefined}
                className={navItemClass(active)}
              >
                <Icon className={cn('size-5', active && 'stroke-[2.5]')} aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** 是不是三個分頁其中之一（不是設定頁、也不是行程詳情頁） */
function isTabRoute(pathname: string) {
  return /\/(backlog|map|expenses)\/?$|\/d\/\d+\/?$/.test(pathname)
}

function navItemClass(active: boolean) {
  return cn(
    'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors',
    active ? 'text-foreground font-medium' : 'text-muted-foreground',
  )
}
