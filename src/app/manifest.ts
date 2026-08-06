import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '旅程 · 旅遊規劃與紀錄',
    short_name: '旅程',
    description:
      '規劃每一天的行程、拖曳排序、在地圖上看順序，並留下旅遊照片紀錄。',
    start_url: '/trips',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'zh-Hant',
    categories: ['travel', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
