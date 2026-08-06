/**
 * Server Action 的統一回傳型別。
 *
 * Server Action 可以被直接 POST 觸發，所以錯誤一律以資料形式回傳而不是 throw，
 * 讓呼叫端能穩定處理，也避免把資料庫錯誤訊息原封不動吐給使用者。
 */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string }

export function ok(): ActionResult<undefined>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data }
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error }
}

/**
 * 內部錯誤代碼 → 使用者看得懂的訊息。
 * 沒有對應的代碼一律給通用訊息，避免把資料庫的錯誤細節吐給使用者。
 */
const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: '請先登入後再試一次',
  TRIP_NOT_FOUND: '找不到這趟旅遊，或你沒有權限',
  SHARE_NOT_FOUND: '這個分享連結已失效',
  SHARE_READ_ONLY: '這是唯讀的分享連結，無法編輯',
  ACTIVITY_NOT_IN_TRIP: '這個行程不屬於這趟旅遊',
  IMAGE_NOT_FOUND: '找不到這張圖片',
  IMAGE_PATH_OUTSIDE_TRIP: '圖片路徑不正確',
}

/** 把未預期的例外轉成使用者看得懂的訊息，同時把細節留在 server log。 */
export function failFrom(scope: string, error: unknown): ActionResult<never> {
  console.error(`[${scope}]`, error)

  const raw = error instanceof Error ? error.message : ''
  if (MESSAGES[raw]) return { ok: false, error: MESSAGES[raw] }

  // Postgres 的權限錯誤代表 RLS 擋下了操作，不需要讓使用者看到原始訊息
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '42501'
  ) {
    return { ok: false, error: '你沒有權限執行這個操作' }
  }

  return { ok: false, error: '操作沒有成功，請稍後再試' }
}
