'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPinOff, TriangleAlert } from 'lucide-react'

import type { MappedActivity } from '@/components/map/leaflet-map'
import { resolveCssColor } from '@/lib/css-color'
import { useGoogleMaps } from '@/lib/use-google-maps'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

/**
 * 「地圖」分頁專用的 Google 地圖。
 *
 * 為什麼這裡跟每日行程的地圖用不同引擎：
 *   - 每日行程的地圖只是輔助看動線，Leaflet 夠用又不花錢
 *   - 「地圖」分頁是專門看地圖的地方，Google 的圖資（尤其是海外的店家、
 *     大眾運輸與街道細節）明顯較完整，值得用掉 API 額度
 *
 * 直接操作 Maps JS API 而不用 @vis.gl 的 APIProvider —— 那會變成第二個
 * script 載入來源，跟地點搜尋的載入器打架（Google 一頁只允許載入一次）。
 * 現在全站共用 useGoogleMaps 這個唯一入口。
 */
export function GoogleTripMap({
  points,
  className,
  selectedId,
  onSelect,
  showRoute = true,
}: {
  points: MappedActivity[]
  className?: string
  selectedId?: string | null
  onSelect?: (id: string) => void
  showRoute?: boolean
}) {
  const state = useGoogleMaps(true)
  const { resolved } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  /*
    地圖重建過幾次。標記那個 effect 要跟著重跑 ——
    重建之後舊的標記掛在已經被丟掉的地圖上，不重畫的話畫面上就空了。
  */
  const [mapVersion, setMapVersion] = useState(0)

  // 建立地圖時要用的初始中心。放 ref 才不會讓 points 一變就重建地圖
  const pointsRef = useRef(points)
  useEffect(() => {
    pointsRef.current = points
  }, [points])

  // 用 ref 保存最新的 callback，避免因為它每次都是新函式而重建標記
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  /*
    建立地圖。深淺模式改變時要「重建」而不是設定 ——
    colorScheme 只能在建構時指定，Google 沒有提供事後修改的方法。

    另外這個專案有設 mapId（AdvancedMarker 需要），而只要有 mapId，
    舊的 styles 陣列就會被忽略，所以深色只能走 colorScheme 這條路。
  */
  useEffect(() => {
    const container = containerRef.current
    if (state !== 'ready' || !container) return

    // Google 沒有 destroy()，清空容器再重建是官方認可的作法
    if (mapRef.current) container.replaceChildren()

    const first = pointsRef.current[0]
    mapRef.current = new google.maps.Map(container, {
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
      colorScheme: resolved === 'dark' ? 'DARK' : 'LIGHT',
      center: first ? { lat: first.lat, lng: first.lng } : undefined,
      zoom: 13,
      gestureHandling: 'greedy',
      disableDefaultUI: true,
      zoomControl: true,
    })
    setMapVersion((v) => v + 1)
  }, [state, resolved])

  // 標記與路線：points 變動時整批重建，數量少（一趟旅遊幾十個）不需要做差異更新
  useEffect(() => {
    const map = mapRef.current
    if (state !== 'ready' || !map || points.length === 0) return

    const markers = points.map((point) => {
      const el = document.createElement('span')
      el.textContent = String(point.order)
      el.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:9999px;
        background:${point.color};color:#fff;
        font-size:12px;font-weight:700;line-height:1;
        border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);
        ${selectedId === point.id ? 'transform:scale(1.25);' : ''}
      `
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: point.lat, lng: point.lng },
        title: point.title,
        content: el,
      })
      marker.addListener('click', () => onSelectRef.current?.(point.id))
      return marker
    })

    // 虛線比實線更像「順序」而不是「實際路線」
    const polyline =
      showRoute && points.length > 1
        ? new google.maps.Polyline({
            path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
            map,
            strokeOpacity: 0,
            icons: [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 0.8,
                  // Google Maps 的選項是 JS 物件，吃不了 CSS 變數
                  strokeColor: resolveCssColor(points[0].color),
                  scale: 3,
                },
                offset: '0',
                repeat: '12px',
              },
            ],
          })
        : null

    // 框住所有標記
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng })
      map.setZoom(15)
    } else {
      const bounds = new google.maps.LatLngBounds()
      for (const p of points) bounds.extend({ lat: p.lat, lng: p.lng })
      map.fitBounds(bounds, 48)
    }

    return () => {
      for (const m of markers) m.map = null
      polyline?.setMap(null)
    }
  }, [state, points, selectedId, showRoute, mapVersion, resolved])

  // 沒有任何有座標的行程時，底下會用 points[0] 當中心而炸掉
  if (points.length === 0) {
    return (
      <div
        className={cn(
          'bg-muted text-muted-foreground flex flex-col items-center justify-center gap-2 text-xs',
          className,
        )}
      >
        <MapPinOff className="size-5" aria-hidden />
        這一天還沒有含地點的行程
      </div>
    )
  }

  if (state === 'rejected') {
    return (
      <div
        className={cn(
          'bg-muted text-muted-foreground flex flex-col items-center justify-center gap-2 px-6 text-center text-xs',
          className,
        )}
      >
        <TriangleAlert className="size-5" aria-hidden />
        Google 地圖載入失敗，詳細錯誤在瀏覽器主控台。
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div ref={containerRef} className="size-full" />
      {state !== 'ready' ? (
        <div className="bg-muted absolute inset-0 animate-pulse" />
      ) : null}
    </div>
  )
}
