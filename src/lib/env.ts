/**
 * 環境變數集中存取。
 *
 * 刻意採用 lazy getter：模組被 import 時不會丟錯，只有真的讀取到缺少的變數時才丟。
 * 這樣 `npm run build` 在還沒設定 .env.local 的機器上也能通過型別與編譯檢查，
 * 而執行期一旦少了必要變數，會得到一則明確的錯誤訊息而不是難解的 undefined。
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `缺少環境變數 ${name}。請複製 .env.example 為 .env.local 並填入實際值（步驟見 README）。`,
    )
  }
  return value
}

export const publicEnv = {
  get supabaseUrl() {
    return required(
      'NEXT_PUBLIC_SUPABASE_URL',
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    )
  },
  get supabaseAnonKey() {
    return required(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  },
  /** 選配：沒填時地圖與地點搜尋降級為手動輸入，其餘功能不受影響 */
  get googleMapsApiKey() {
    return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  },
  /** AdvancedMarker 需要 Map ID */
  get googleMapsMapId() {
    return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? ''
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  },
}

/** 地圖功能是否可用；未設定金鑰時 UI 會顯示提示而不是壞掉的地圖 */
export function isMapsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
}

/** 只在 server 端呼叫。service role key 絕不可進入 client bundle。 */
export function getServiceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('service role key 只能在 server 端使用')
  }
  return required(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

/** Supabase Storage 的公開讀取 base URL */
export function storagePublicBase(): string {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public`
}

/**
 * next.config.ts 的 images.remotePatterns 需要 Supabase 的來源資訊。
 *
 * protocol 與 port 都要一起帶出來，不能寫死成 https ——
 * 本機開發（npx supabase start）與自架環境是 http://127.0.0.1:54321，
 * 寫死的話任何有圖片的頁面都會直接 500。
 */
export function supabaseImageOrigin(): {
  protocol: 'http' | 'https'
  hostname: string
  port: string
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    const parsed = new URL(url)
    return {
      protocol: parsed.protocol === 'http:' ? 'http' : 'https',
      hostname: parsed.hostname,
      port: parsed.port,
    }
  } catch {
    return null
  }
}
