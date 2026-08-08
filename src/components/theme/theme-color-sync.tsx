'use client'

import { useEffect } from 'react'

import { themeMeta } from '@/lib/theme'
import { useTheme } from '@/lib/use-theme'

/**
 * 讓瀏覽器 UI 的顏色跟著主題走。
 *
 * <meta name="theme-color"> 決定 iOS Safari 的狀態列與 Android 的網址列底色。
 * 靜態寫在 metadata 裡只能用 media query 分深淺，追不上「使用者選了哪一套主題」，
 * 加到主畫面之後狀態列就會跟 App 對不起來。
 */
export function ThemeColorSync() {
  const { theme, resolved } = useTheme()

  useEffect(() => {
    const color = themeMeta(theme).browser[resolved]
    let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.name = 'theme-color'
      document.head.appendChild(tag)
    }
    tag.content = color
  }, [theme, resolved])

  return null
}
