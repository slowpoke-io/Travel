/**
 * 對應 supabase/migrations/ 的資料庫型別。
 *
 * 建好 Supabase 專案並套用 migration 後，可用以下指令重新產生以確保同步：
 *   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 */

export type ActivityCategory =
  | 'sight'
  | 'food'
  | 'lodging'
  | 'transport'
  | 'shopping'
  | 'other'

export type ImageRole = 'cover' | 'info' | 'record'

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
        Omit<TripRow, 'id' | 'created_at' | 'updated_at'> & { id?: string },
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
      images: TableDef<
        ImageRow,
        Omit<ImageRow, 'id' | 'created_at'> & { id?: string },
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
