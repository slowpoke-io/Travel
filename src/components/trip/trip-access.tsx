'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type TripAccess = {
  /** 'owner' = 已登入的擁有者；'guest' = 透過分享連結進來的訪客 */
  mode: 'owner' | 'guest'
  canEdit: boolean
  tripId: string
  /** guest 模式才有 */
  shareToken?: string
}

const TripAccessContext = createContext<TripAccess | null>(null)

/**
 * 讓 /trips/[tripId]/* 與 /s/[token]/* 能共用同一批 UI 元件。
 * 元件本身不需要知道自己在哪條路徑上，只要問這個 context。
 */
export function TripAccessProvider({
  value,
  children,
}: {
  value: TripAccess
  children: ReactNode
}) {
  return (
    <TripAccessContext.Provider value={value}>
      {children}
    </TripAccessContext.Provider>
  )
}

export function useTripAccess(): TripAccess {
  const ctx = useContext(TripAccessContext)
  if (!ctx) {
    throw new Error('useTripAccess 必須在 TripAccessProvider 內使用')
  }
  return ctx
}

/** 產生路徑前綴：擁有者是 /trips/{id}，訪客是 /s/{token} */
export function useBasePath(): string {
  const access = useTripAccess()
  return access.mode === 'owner'
    ? `/trips/${access.tripId}`
    : `/s/${access.shareToken}`
}
