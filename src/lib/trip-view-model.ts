import type { ActivityWithRelations, TripBundle } from '@/lib/queries'

/**
 * 把一整包旅遊資料拆成畫面需要的形狀。
 * 純函式，owner 與 share 兩條路徑共用。
 */
export type TripViewModel = {
  /** dayId → 該天的行程（已依 position 排序） */
  byDay: Map<string, ActivityWithRelations[]>
  /** 儲備區（day_id 為 null） */
  backlog: ActivityWithRelations[]
  /** dayId → 行程數，給日期分頁與「移動到」清單用 */
  counts: Record<string, number>
  totalActivities: number
}

export function buildTripViewModel(bundle: TripBundle): TripViewModel {
  const byDay = new Map<string, ActivityWithRelations[]>()
  for (const day of bundle.days) byDay.set(day.id, [])

  const backlog: ActivityWithRelations[] = []

  for (const activity of bundle.activities) {
    if (!activity.day_id) {
      backlog.push(activity)
      continue
    }
    const list = byDay.get(activity.day_id)
    if (list) list.push(activity)
    else backlog.push(activity) // 理論上不會發生；資料異常時至少不會憑空消失
  }

  const sortByPosition = (a: ActivityWithRelations, b: ActivityWithRelations) =>
    a.position - b.position

  for (const list of byDay.values()) list.sort(sortByPosition)
  backlog.sort(sortByPosition)

  const counts: Record<string, number> = {}
  for (const [dayId, list] of byDay) counts[dayId] = list.length

  return {
    byDay,
    backlog,
    counts,
    totalActivities: bundle.activities.length,
  }
}
