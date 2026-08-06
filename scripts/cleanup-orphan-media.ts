/**
 * 清理 Storage 中的孤兒圖片檔案。
 *
 * 正常流程下，刪除圖片／行程／旅遊時都會一併刪掉檔案。這支腳本是保險：
 * 如果曾經發生「檔案已上傳但 commitImages 失敗」或刪除時網路中斷，
 * bucket 裡就會留下沒有任何資料列指向的檔案，長期累積會佔用空間。
 *
 * 用法：
 *   npx tsx scripts/cleanup-orphan-media.ts          # 只列出，不刪除
 *   npx tsx scripts/cleanup-orphan-media.ts --delete # 實際刪除
 */
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'trip-media'
/** 只清理超過這個時間的檔案，避免刪掉正在上傳中的 */
const MIN_AGE_MS = 60 * 60 * 1000

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    '請先設定 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY。\n' +
      '例如：set -a && source .env.local && set +a && npx tsx scripts/cleanup-orphan-media.ts',
  )
  process.exit(1)
}

const shouldDelete = process.argv.includes('--delete')
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
})

async function listAllObjects(prefix: string): Promise<string[]> {
  const found: string[] = []
  let offset = 0
  const limit = 100

  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit, offset })
    if (error) throw error
    if (!data?.length) break

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) {
        // 沒有 id 代表這是資料夾（每個 trip 一個資料夾），往下遞迴
        found.push(...(await listAllObjects(path)))
      } else {
        const age = Date.now() - new Date(item.created_at ?? 0).getTime()
        if (age > MIN_AGE_MS) found.push(path)
      }
    }

    if (data.length < limit) break
    offset += limit
  }
  return found
}

async function main() {
  console.log('掃描 Storage…')
  const objects = await listAllObjects('')
  console.log(`bucket 內共 ${objects.length} 個檔案（已排除 1 小時內上傳的）`)

  const referenced = new Set<string>()
  let from = 0
  const page = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('images')
      .select('path, thumb_path')
      .range(from, from + page - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      referenced.add(row.path)
      if (row.thumb_path) referenced.add(row.thumb_path)
    }
    if (data.length < page) break
    from += page
  }
  console.log(`資料庫中有 ${referenced.size} 個檔案路徑被引用`)

  const orphans = objects.filter((p) => !referenced.has(p))
  if (orphans.length === 0) {
    console.log('沒有孤兒檔案，一切正常。')
    return
  }

  console.log(`\n找到 ${orphans.length} 個孤兒檔案：`)
  for (const p of orphans.slice(0, 50)) console.log(`  ${p}`)
  if (orphans.length > 50) console.log(`  …以及其他 ${orphans.length - 50} 個`)

  if (!shouldDelete) {
    console.log('\n這是預覽模式。加上 --delete 才會真的刪除。')
    return
  }

  // 分批刪除，避免單次請求過大
  for (let i = 0; i < orphans.length; i += 100) {
    const batch = orphans.slice(i, i + 100)
    const { error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) throw error
    console.log(`已刪除 ${Math.min(i + 100, orphans.length)}/${orphans.length}`)
  }
  console.log('清理完成。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
