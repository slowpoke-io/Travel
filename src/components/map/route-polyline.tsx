'use client'

import { useEffect } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

/**
 * 依行程順序把標記連成一條線。
 *
 * `@vis.gl/react-google-maps` 沒有內建 Polyline 元件，直接操作
 * google.maps.Polyline 並在卸載時清乾淨。
 */
export function RoutePolyline({
  path,
  color,
}: {
  path: { lat: number; lng: number }[]
  color: string
}) {
  const map = useMap()

  useEffect(() => {
    if (!map || path.length < 2) return

    const polyline = new google.maps.Polyline({
      path,
      map,
      strokeColor: color,
      strokeOpacity: 0.7,
      strokeWeight: 3,
      // 虛線比實線更容易看出「這是順序」而不是「這是實際路線」
      icons: [
        {
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
          offset: '0',
          repeat: '12px',
        },
      ],
    })

    return () => polyline.setMap(null)
  }, [map, path, color])

  return null
}
