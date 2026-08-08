'use client'

import { Check, Monitor, Moon, Sun } from 'lucide-react'

import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { THEMES, type ThemeMode } from '@/lib/theme'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '淺色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '系統', icon: Monitor },
]

/**
 * 外觀設定。放在帳號選單裡 —— 這是「這個人偏好什麼」，
 * 不是某一趟旅遊的設定，所以不該出現在旅遊設定頁。
 */
export function ThemeMenu() {
  const { theme, mode, setTheme, setMode } = useTheme()

  return (
    <>
      <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
        外觀
      </DropdownMenuLabel>

      {/* 深淺模式：三選一，橫排省空間 */}
      <div className="flex gap-1 px-2 pb-1.5">
        {MODES.map(({ value, label, icon: Icon }) => {
          const active = mode === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={active}
              className={cn(
                'flex h-8 flex-1 items-center justify-center gap-1 rounded-md text-xs transition-colors',
                active
                  ? 'bg-foreground text-background font-medium'
                  : 'hover:bg-muted',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          )
        })}
      </div>

      {THEMES.map((t) => {
        const active = theme === t.id
        return (
          <DropdownMenuItem
            key={t.id}
            onSelect={(e) => {
              // 選主題不該把選單關掉，才能一個一個試
              e.preventDefault()
              setTheme(t.id)
            }}
            className="gap-2"
          >
            <span
              aria-hidden
              data-theme={t.id}
              className="border-border size-4 shrink-0 overflow-hidden rounded-full border"
              style={{
                background:
                  'linear-gradient(135deg, var(--l-primary) 0 50%, var(--l-accent) 50% 100%)',
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm">{t.label}</span>
              <span className="text-muted-foreground block text-[11px] leading-tight">
                {t.hint}
              </span>
            </span>
            {active ? (
              <Check className="size-4 shrink-0" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}
