import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { removeStorageObjects } from '@/lib/mutations/images'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

/**
 * 丟棄「已經傳進 Storage、但還沒寫進 images」的檔案。
 *
 * 圖片是在選取當下就上傳的，所以使用者如果把預覽刪掉、或整個關掉表單，
 * 檔案已經在 Storage 裡了。不主動清掉的話它們就變成孤兒 —— 佔空間，
 * 而且沒有任何資料列指向它們，使用者也看不到、刪不掉。
 *
 * 只接受以 tripId 開頭的路徑。呼叫端已經驗過使用者對這趟旅遊的權限，
 * 這個前綴檢查則擋掉「宣稱要刪別人的檔案」。
 */
export async function discardUploads(
  client: Client,
  params: { tripId: string; paths: string[] },
): Promise<void> {
  const safe = params.paths.filter((p) => p.startsWith(`${params.tripId}/`))
  if (!safe.length) return

  // 這些檔案還沒有 images 資料列，所以不需要（也不能）先刪資料列
  await removeStorageObjects(client, safe)
}
