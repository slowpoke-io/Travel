'use client'

import { useRef } from 'react'
import { LogOut } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function AccountMenu({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string | null
  email: string | null
  avatarUrl: string | null
}) {
  const initial = (displayName ?? email ?? '?').trim().charAt(0).toUpperCase()
  const signOutForm = useRef<HTMLFormElement>(null)

  return (
    <>
      {/*
        表單放在 dropdown 外面。放在裡面的話，選單會在送出之前先卸載，
        submit 事件就消失了。
      */}
      <form ref={signOutForm} action="/auth/signout" method="post" hidden />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-full"
            aria-label="帳號選單"
          >
            <Avatar className="size-9">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">
              {displayName ?? '未命名使用者'}
            </p>
            {email ? (
              <p className="text-muted-foreground truncate text-xs">{email}</p>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => signOutForm.current?.requestSubmit()}
          >
            <LogOut className="size-4" aria-hidden />
            登出
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
