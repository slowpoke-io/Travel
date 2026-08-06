-- =============================================================================
-- 0002_rls.sql — Row Level Security
--
-- 原則：RLS 只處理「已登入的擁有者」。
-- 分享連結（/s/[token]）的存取完全不走 RLS —— 由 Next.js server 端驗證 token
-- 後改用 service role 操作。因此 anon role 在所有表上都是預設拒絕，攻擊面最小。
-- =============================================================================

create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trips t
     where t.id = p_trip_id and t.owner_id = (select auth.uid())
  );
$$;

grant execute on function public.is_trip_owner(uuid) to authenticated;

alter table public.profiles      enable row level security;
alter table public.trips         enable row level security;
alter table public.trip_days     enable row level security;
alter table public.activities    enable row level security;
alter table public.tags          enable row level security;
alter table public.activity_tags enable row level security;
alter table public.images        enable row level security;

-- ------------------------------------------------------------ profiles ----
create policy "profiles: self read"   on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles: self update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- --------------------------------------------------------------- trips ----
create policy "trips: owner read"   on public.trips for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "trips: owner insert" on public.trips for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "trips: owner update" on public.trips for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "trips: owner delete" on public.trips for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- ----------------------------------------------- trip-scoped 子表通用 ----
create policy "trip_days: owner all" on public.trip_days for all to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));

create policy "activities: owner all" on public.activities for all to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));

create policy "tags: owner all" on public.tags for all to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));

create policy "images: owner all" on public.images for all to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));

-- --------------------------------------------------------- activity_tags --
create policy "activity_tags: owner all" on public.activity_tags for all to authenticated
  using (
    exists (select 1 from public.activities a
             where a.id = activity_id and public.is_trip_owner(a.trip_id))
  )
  with check (
    exists (select 1 from public.activities a
             where a.id = activity_id and public.is_trip_owner(a.trip_id))
    and
    exists (select 1 from public.tags t
             where t.id = tag_id and public.is_trip_owner(t.trip_id))
  );
