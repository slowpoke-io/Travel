'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, Inbox, Map, Settings2 } from 'lucide-react'

import { useBasePath, useTripAccess } from '@/components/trip/trip-access'
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
export function BottomNav() {
  const pathname = usePathname()
  const base = useBasePath()
  const access = useTripAccess()

  const current = tripViewFromPathname(pathname)

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
    ]

  const settingsHref = `${base}/settings`
  const onSettings = pathname.endsWith('/settings')

  return (
    <nav className="bg-background/95 pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t backdrop-blur">
      <ul className="flex">
        {tabs.map(({ tab, view, label, icon: Icon }) => {
          // 在設定頁或行程詳情頁時，三個分頁都不該亮
          const active = !onSettings && isTabRoute(pathname) && current.tab === tab
          return (
            <li key={tab} className="flex-1">
              {/*
                用 <a> 而不是 <Link>：這三個分頁的資料在同一份 bundle 裡已經
                全部拿到了，走 Next 的導航只會讓伺服器把同樣的查詢重跑一次，
                換來一段空白。這裡攔下點擊改用 pushState，切換是瞬間的。
                href 保留著，長按複製連結、在新分頁開啟都照常。
              */}
              <a
                href={tripViewHref(base, view)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                  e.preventDefault()
                  pushTripView(base, view)
                }}
                aria-current={active ? 'page' : undefined}
                className={navItemClass(active)}
              >
                <Icon className={cn('size-5', active && 'stroke-[2.5]')} aria-hidden />
                {label}
              </a>
            </li>
          )
        })}

        {/* 訪客沒有設定頁 —— 旅遊本體只有擁有者能改 */}
        {access.mode === 'owner' ? (
          <li className="flex-1">
            <Link
              href={settingsHref}
              prefetch
              aria-current={onSettings ? 'page' : undefined}
              className={navItemClass(onSettings)}
            >
              <Settings2
                className={cn('size-5', onSettings && 'stroke-[2.5]')}
                aria-hidden
              />
              設定
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}

/** 是不是三個分頁其中之一（不是設定頁、也不是行程詳情頁） */
function isTabRoute(pathname: string) {
  return /\/(backlog|map)\/?$|\/d\/\d+\/?$/.test(pathname)
}

function navItemClass(active: boolean) {
  return cn(
    'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors',
    active ? 'text-foreground font-medium' : 'text-muted-foreground',
  )
}
