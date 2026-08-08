/**
 * 對應 supabase/migrations/ 的資料庫型別。
 *
 * 建好 Supabase 專案並套用 migration 後，可用以下指令重新產生以確保同步：
 *   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 */

export type ActivityCategory =
  'sight' | 'food' | 'lodging' | 'transport' | 'shopping' | 'other'

/**
 * receipt 的語意是「屬於某筆花費的圖片」，不一定是收據 ——
 * 名字是歷史因素，介面上一律稱為「圖片」。詳見 0008_expense_enums.sql。
 */
export type ImageRole = 'cover' | 'info' | 'record' | 'receipt'

/**
 * 花費分類。刻意不沿用 ActivityCategory —— 那是「地點的種類」，
 * 這是「付款的種類」。機票、簽證、網卡都不是地點。
 */
export type ExpenseCategory =
  | 'food'
  | 'lodging'
  | 'transport'
  | 'ticket'
  | 'shopping'
  | 'telecom'
  | 'other'

export type ActivityLink = {
  label: string
  url: string
}

/**
 * 重要時間。刻意做成可命名的清單而不是單一的 start_time ——
 * 需要記的是班機、訂位、時段票、末班車這類「你無法控制」的時間，
 * 數量不固定，而且必須說明是什麼時間。
 */
export type ActivityTime = {
  label: string
  /** HH:MM */
  time: string
}

type Timestamps = {
  created_at: string
  updated_at: string
}

export type ProfileRow = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type TripRow = Timestamps & {
  id: string
  owner_id: string
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  timezone: string
  summary: string | null
  share_token: string | null
  share_enabled: boolean
  share_can_edit: boolean
  /** 結算幣別：所有統計換算到它 */
  home_currency: string
  /** 這趟主要花費的幣別（去韓國就是 KRW）。null = 只花結算幣別 */
  local_currency: string | null
  /** 1 個 local_currency 等於幾個 home_currency */
  fx_rate: number | null
  /** 分享連結看不看得到花費。預設關閉 */
  share_show_expenses: boolean
}

export type ExpenseRow = Timestamps & {
  id: string
  trip_id: string
  /** null = 沒有指定天數，畫面上歸在「其他」 */
  day_id: string | null
  /** null = 沒有對應到特定地點 */
  activity_id: string | null
  title: string | null
  category: ExpenseCategory
  amount: number
  currency: string
  /** 建立當下的匯率快照。改整趟的匯率不會追溯改到舊帳 */
  rate: number
  /** 資料庫算出來的換算值（generated column），不可寫入 */
  amount_home: number
  spent_at: string | null
  note: string | null
  created_by: string | null
}

export type TripDayRow = {
  id: string
  trip_id: string
  day_index: number
  date: string | null
  title: string | null
  note: string | null
  created_at: string
}

export type ActivityRow = Timestamps & {
  id: string
  trip_id: string
  /** null = 在「行程儲備區」 */
  day_id: string | null
  position: number
  title: string
  category: ActivityCategory
  notes: string | null
  links: ActivityLink[]
  times: ActivityTime[]
  place_name: string | null
  address: string | null
  lat: number | null
  lng: number | null
  google_place_id: string | null
  created_by: string | null
}

export type TagRow = {
  id: string
  trip_id: string
  name: string
  color: string
  created_at: string
}

export type ActivityTagRow = {
  activity_id: string
  tag_id: string
}

export type ImageRow = {
  id: string
  trip_id: string
  /** null = 屬於整趟旅遊而非單一行程 */
  activity_id: string | null
  /** null = 不屬於任何一筆花費 */
  expense_id: string | null
  role: ImageRole
  path: string
  thumb_path: string | null
  caption: string | null
  width: number | null
  height: number | null
  bytes: number | null
  mime: string | null
  position: number
  taken_at: string | null
  created_by: string | null
  created_at: string
}

type TableDef<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        Partial<ProfileRow> & Pick<ProfileRow, 'id'>,
        Partial<ProfileRow>
      >
      trips: TableDef<
        TripRow,
        // 幣別與分享相關欄位資料庫都有預設值，建立時不必逐一傳
        Omit<
          TripRow,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'home_currency'
          | 'local_currency'
          | 'fx_rate'
          | 'share_show_expenses'
        > &
          Partial<
            Pick<
              TripRow,
              | 'id'
              | 'home_currency'
              | 'local_currency'
              | 'fx_rate'
              | 'share_show_expenses'
            >
          >,
        Partial<Omit<TripRow, 'id' | 'owner_id'>>
      >
      trip_days: TableDef<
        TripDayRow,
        Omit<TripDayRow, 'id' | 'created_at'> & { id?: string },
        Partial<Omit<TripDayRow, 'id' | 'trip_id'>>
      >
      activities: TableDef<
        ActivityRow,
        Omit<
          ActivityRow,
          'id' | 'created_at' | 'updated_at' | 'links' | 'times'
        > & {
          id?: string
          links?: ActivityLink[]
          times?: ActivityTime[]
        },
        Partial<Omit<ActivityRow, 'id' | 'trip_id'>>
      >
      tags: TableDef<
        TagRow,
        Omit<TagRow, 'id' | 'created_at'> & { id?: string },
        Partial<Omit<TagRow, 'id' | 'trip_id'>>
      >
      activity_tags: TableDef<ActivityTagRow, ActivityTagRow, never>
      expenses: TableDef<
        ExpenseRow,
        // amount_home 是 generated column，寫不得
        Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at' | 'amount_home'> & {
          id?: string
        },
        Partial<Omit<ExpenseRow, 'id' | 'trip_id' | 'amount_home'>>
      >
      images: TableDef<
        ImageRow,
        Omit<ImageRow, 'id' | 'created_at' | 'expense_id'> & {
          id?: string
          expense_id?: string | null
        },
        Partial<Omit<ImageRow, 'id' | 'trip_id'>>
      >
    }
    Views: Record<never, never>
    Functions: {
      renumber_container: {
        Args: { p_trip_id: string; p_day_id: string | null }
        Returns: void
      }
      reorder_activities: {
        Args: { p_trip_id: string; p_day_id: string | null; p_ids: string[] }
        Returns: void
      }
      move_activity: {
        Args: { p_activity_id: string; p_target_day_id: string | null }
        Returns: void
      }
      resync_trip_days: {
        Args: { p_trip_id: string }
        Returns: void
      }
      insert_trip_day: {
        Args: { p_trip_id: string; p_after_index?: number | null }
        Returns: string
      }
      delete_trip_day: {
        Args: { p_day_id: string }
        Returns: void
      }
      set_trip_dates: {
        Args: {
          p_trip_id: string
          p_start_date: string | null
          p_end_date: string | null
        }
        Returns: void
      }
      set_cover_image: {
        Args: { p_image_id: string }
        Returns: void
      }
      is_trip_owner: {
        Args: { p_trip_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_category: ActivityCategory
      image_role: ImageRole
    }
    CompositeTypes: Record<never, never>
  }
}
