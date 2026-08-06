-- =============================================================================
-- 0005_grants.sql — Data API 權限
--
-- 新版 Supabase 專案「不會」自動把 public schema 的新資料表暴露給 Data API 角色
-- （anon / authenticated / service_role），必須明確 GRANT，否則 PostgREST 會回
-- 「permission denied for table ...」。
--
-- GRANT 只是「這個角色能不能碰這張表」，實際能看到／改到哪些「列」仍由 0002 的
-- RLS policy 決定。兩者是互補的，缺一不可。
--
--   authenticated → 完整 DML，但受 RLS 限制，只動得到自己的旅遊
--   service_role  → 完整 DML 且繞過 RLS，只用於分享連結（server 端驗證 token 後）
--   anon          → 刻意不給任何權限，未登入者一律拒絕
-- =============================================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.profiles,
  public.trips,
  public.trip_days,
  public.activities,
  public.tags,
  public.activity_tags,
  public.images
to authenticated, service_role;

grant execute on function
  public.is_trip_owner(uuid),
  public.renumber_container(uuid, uuid),
  public.reorder_activities(uuid, uuid, uuid[]),
  public.move_activity(uuid, uuid),
  public.resync_trip_days(uuid),
  public.insert_trip_day(uuid, int),
  public.delete_trip_day(uuid),
  public.set_trip_dates(uuid, date, date),
  public.set_cover_image(uuid)
to authenticated, service_role;

-- 明確撤銷 anon 的權限。未登入者要看分享的旅遊，走的是 server 端驗證 token 後
-- 以 service_role 讀取的路徑（見 src/lib/share/guard.ts），不需要直接存取資料表。
revoke all on
  public.profiles,
  public.trips,
  public.trip_days,
  public.activities,
  public.tags,
  public.activity_tags,
  public.images
from anon;
