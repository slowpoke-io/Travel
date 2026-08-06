-- =============================================================================
-- 0003_functions.sql — RPC
--
-- 全部使用 SECURITY INVOKER：
--   * 已登入擁有者呼叫 → RLS 生效，只能動自己的資料
--   * 分享連結的匿名編輯 → server 端驗證 token 後用 service role 呼叫（繞過 RLS），
--     但函式內部仍以 trip_id 過濾，擋掉跨旅遊的 id
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 重新編號某個容器（某一天，或 p_day_id = NULL 代表儲備區）的 position 為 0..n-1
-- ---------------------------------------------------------------------------
create or replace function public.renumber_container(p_trip_id uuid, p_day_id uuid)
returns void
language sql
security invoker
as $$
  with ordered as (
    select id, (row_number() over (order by position, created_at)) - 1 as rn
      from public.activities
     where trip_id = p_trip_id
       and day_id is not distinct from p_day_id
  )
  update public.activities a
     set position = o.rn
    from ordered o
   where a.id = o.id and a.position is distinct from o.rn;
$$;

-- ---------------------------------------------------------------------------
-- 拖曳排序：一次送出該容器完整的 id 順序，position 直接等於陣列索引。
-- 單日行程量小（通常 < 20），比 fractional index 簡單且不會出現順序漂移。
-- 同時可用來把行程搬進該容器（day_id 一併更新）。
-- ---------------------------------------------------------------------------
create or replace function public.reorder_activities(
  p_trip_id uuid,
  p_day_id  uuid,
  p_ids     uuid[]
)
returns void
language plpgsql
security invoker
as $$
begin
  update public.activities a
     set day_id     = p_day_id,
         position   = arr.ord - 1,
         updated_at = now()
    from unnest(p_ids) with ordinality as arr(id, ord)
   where a.id = arr.id
     and a.trip_id = p_trip_id;   -- 擋掉不屬於這趟旅遊的 id
end $$;

-- ---------------------------------------------------------------------------
-- 把單一行程移到某天（或 NULL = 儲備區），附加在該容器尾端
-- ---------------------------------------------------------------------------
create or replace function public.move_activity(
  p_activity_id   uuid,
  p_target_day_id uuid
)
returns void
language plpgsql
security invoker
as $$
declare
  v_trip_id uuid;
  v_from_day uuid;
  v_next    int;
begin
  select trip_id, day_id into v_trip_id, v_from_day
    from public.activities where id = p_activity_id;
  if v_trip_id is null then
    raise exception 'activity % not found or not accessible', p_activity_id;
  end if;

  if v_from_day is not distinct from p_target_day_id then
    return;  -- 已經在目標容器內，不動
  end if;

  select coalesce(max(position) + 1, 0) into v_next
    from public.activities
   where trip_id = v_trip_id
     and day_id is not distinct from p_target_day_id;

  -- 目標日若不屬於這趟旅遊，複合外鍵會擋下
  update public.activities
     set day_id = p_target_day_id, position = v_next, updated_at = now()
   where id = p_activity_id;

  -- 來源容器補上空隙，維持 position 為連續的 0..n-1
  perform public.renumber_container(v_trip_id, v_from_day);
end $$;

-- ---------------------------------------------------------------------------
-- 重新同步天數：day_index 補成連續的 1..n，並依 trips.start_date 推算每天日期，
-- 同時把 trips.end_date 對齊天數。
-- 靠 trip_days_index_uq 的 DEFERRABLE 才能在單一 UPDATE 內安全重排。
-- ---------------------------------------------------------------------------
create or replace function public.resync_trip_days(p_trip_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_start date;
  v_count int;
begin
  select start_date into v_start from public.trips where id = p_trip_id;

  with ordered as (
    select id, row_number() over (order by day_index, created_at) as rn
      from public.trip_days
     where trip_id = p_trip_id
  )
  update public.trip_days d
     set day_index = o.rn
    from ordered o
   where d.id = o.id and d.day_index is distinct from o.rn::int;

  select count(*) into v_count from public.trip_days where trip_id = p_trip_id;

  if v_start is not null then
    update public.trip_days
       set date = v_start + (day_index - 1)
     where trip_id = p_trip_id;

    update public.trips
       set end_date = v_start + (v_count - 1)
     where id = p_trip_id;
  else
    update public.trip_days set date = null where trip_id = p_trip_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 在第 p_after_index 天之後插入一天（p_after_index = NULL 代表加在最後）
-- ---------------------------------------------------------------------------
create or replace function public.insert_trip_day(
  p_trip_id      uuid,
  p_after_index  int default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_index int;
  v_id        uuid;
begin
  if p_after_index is null then
    select coalesce(max(day_index), 0) + 1 into v_new_index
      from public.trip_days where trip_id = p_trip_id;
  else
    v_new_index := p_after_index + 1;
    update public.trip_days
       set day_index = day_index + 1
     where trip_id = p_trip_id and day_index >= v_new_index;
  end if;

  insert into public.trip_days (trip_id, day_index)
  values (p_trip_id, v_new_index)
  returning id into v_id;

  perform public.resync_trip_days(p_trip_id);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- 刪除某一天。該天的行程「退回儲備區」而不是消失 —— 明確搬到儲備區尾端，
-- 而非依賴外鍵的 ON DELETE SET NULL（那只是最後一道安全網）。
-- ---------------------------------------------------------------------------
create or replace function public.delete_trip_day(p_day_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_trip_id uuid;
  v_count   int;
  v_base    int;
begin
  select trip_id into v_trip_id from public.trip_days where id = p_day_id;
  if v_trip_id is null then
    raise exception 'trip day % not found or not accessible', p_day_id;
  end if;

  select count(*) into v_count from public.trip_days where trip_id = v_trip_id;
  if v_count <= 1 then
    raise exception 'a trip must keep at least one day';
  end if;

  select coalesce(max(position) + 1, 0) into v_base
    from public.activities
   where trip_id = v_trip_id and day_id is null;

  update public.activities
     set day_id = null, position = v_base + position, updated_at = now()
   where trip_id = v_trip_id and day_id = p_day_id;

  delete from public.trip_days where id = p_day_id;

  perform public.renumber_container(v_trip_id, null);
  perform public.resync_trip_days(v_trip_id);
end $$;

-- ---------------------------------------------------------------------------
-- 依起訖日期調整天數：不足補、過多則刪最後幾天（行程退回儲備區）
-- ---------------------------------------------------------------------------
create or replace function public.set_trip_dates(
  p_trip_id    uuid,
  p_start_date date,
  p_end_date   date
)
returns void
language plpgsql
security invoker
as $$
declare
  v_target int;
  v_count  int;
  v_day    uuid;
begin
  if p_start_date is not null and p_end_date is not null then
    v_target := (p_end_date - p_start_date) + 1;
    if v_target < 1 then
      raise exception 'end_date must be on or after start_date';
    end if;
  else
    v_target := null;
  end if;

  update public.trips
     set start_date = p_start_date,
         end_date   = p_end_date
   where id = p_trip_id;

  if v_target is not null then
    select count(*) into v_count from public.trip_days where trip_id = p_trip_id;

    while v_count < v_target loop
      perform public.insert_trip_day(p_trip_id, null);
      v_count := v_count + 1;
    end loop;

    while v_count > v_target loop
      select id into v_day from public.trip_days
       where trip_id = p_trip_id order by day_index desc limit 1;
      perform public.delete_trip_day(v_day);
      v_count := v_count - 1;
    end loop;
  end if;

  perform public.resync_trip_days(p_trip_id);
end $$;

-- ---------------------------------------------------------------------------
-- 設定封面：把同一擁有者（activity 或 trip）底下既有的 cover 降級為 record，
-- 再把指定圖片升為 cover。partial unique index 保證最終只會有一張。
-- ---------------------------------------------------------------------------
create or replace function public.set_cover_image(p_image_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_trip_id     uuid;
  v_activity_id uuid;
begin
  select trip_id, activity_id into v_trip_id, v_activity_id
    from public.images where id = p_image_id;
  if v_trip_id is null then
    raise exception 'image % not found or not accessible', p_image_id;
  end if;

  update public.images
     set role = 'record'
   where role = 'cover'
     and id <> p_image_id
     and trip_id = v_trip_id
     and activity_id is not distinct from v_activity_id;

  update public.images set role = 'cover' where id = p_image_id;
end $$;

grant execute on function
  public.renumber_container(uuid, uuid),
  public.reorder_activities(uuid, uuid, uuid[]),
  public.move_activity(uuid, uuid),
  public.resync_trip_days(uuid),
  public.insert_trip_day(uuid, int),
  public.delete_trip_day(uuid),
  public.set_trip_dates(uuid, date, date),
  public.set_cover_image(uuid)
to authenticated;
