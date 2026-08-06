'use client'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'

import { cn } from '@/lib/utils'

import 'leaflet/dist/leaflet.css'

export type MappedActivity = {
  id: string
  title: string
  lat: number
  lng: number
  /** 標記上顯示的序號 */
  order: number
  color: string
  /** 點擊標記時額外顯示的說明（通常是地址） */
  subtitle?: string | null
}

/**
 * CARTO 的底圖（資料來自 OpenStreetMap）。
 * 比 OSM 預設樣式乾淨，標記與路線在上面更清楚，也有深色版本。
 * 兩者都不需要 API 金鑰。
 */
const TILES = {
  light:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
}
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

/** 用 divIcon 畫出帶序號的圓形標記，跟卡片左側的徽章一致 */
function numberedIcon(order: number, color: string, active: boolean) {
  return L.divIcon({
    className: '',
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:28px;height:28px;border-radius:9999px;
      background:${color};color:#fff;
      font-size:12px;font-weight:700;line-height:1;
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
      ${active ? 'transform:scale(1.25);' : ''}
    ">${order}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

/** 地圖載入後自動框住所有標記 */
function FitBounds({ points }: { points: MappedActivity[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
      return
    }
    map.fitBounds(
      points.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [40, 40] },
    )
  }, [map, points])

  return null
}

/**
 * 容器尺寸變動時（例如地圖從收合展開）Leaflet 需要被告知重新計算，
 * 否則會出現灰色未載入的區塊。
 */
function InvalidateOnResize() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

  return null
}

export function LeafletMap({
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
  const path = useMemo(
    () => points.map((p) => [p.lat, p.lng] as [number, number]),
    [points],
  )

  const isDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <MapContainer
      center={[points[0].lat, points[0].lng]}
      zoom={13}
      scrollWheelZoom
      zoomControl={false}
      attributionControl
      className={cn('size-full', className)}
    >
      <TileLayer
        url={isDark ? TILES.dark : TILES.light}
        attribution={ATTRIBUTION}
        maxZoom={20}
      />

      <FitBounds points={points} />
      <InvalidateOnResize />

      {showRoute && path.length > 1 ? (
        // 虛線比實線更容易看出「這是順序」而不是「這是實際路線」
        <Polyline
          positions={path}
          pathOptions={{
            color: points[0].color,
            weight: 3,
            opacity: 0.7,
            dashArray: '6 8',
          }}
        />
      ) : null}

      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={numberedIcon(point.order, point.color, selectedId === point.id)}
          title={point.title}
          eventHandlers={
            onSelect ? { click: () => onSelect(point.id) } : undefined
          }
        >
          {/* 點擊標記時顯示名稱 —— 只有編號的話根本認不出是哪個行程 */}
          <Popup closeButton={false} autoPan>
            <span className="block text-sm font-medium">
              {point.order}. {point.title}
            </span>
            {point.subtitle ? (
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {point.subtitle}
              </span>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
