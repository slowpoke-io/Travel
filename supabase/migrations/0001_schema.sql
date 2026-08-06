-- =============================================================================
-- 0001_schema.sql — 資料表、列舉、索引、觸發器
-- =============================================================================

-- ---------------------------------------------------------------- enums ----
create type activity_category as enum (
  'sight',     -- 景點
  'food',      -- 餐飲
  'lodging',   -- 住宿
  'transport', -- 交通
  'shopping',  -- 購物
  'other'      -- 其他
);

create type image_role as enum (
  'cover',   -- 封面（每個 activity / trip 至多一張）
  'info',    -- 資訊：票券、菜單、營業時間截圖
  'record'   -- 旅遊紀錄：出遊後拍的照片
);

-- ------------------------------------------------------------- helpers ----
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------ profiles ----
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Google 登入後自動建立 / 更新 profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email        = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url   = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- trips ----
create table public.trips (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  title          text not null check (length(btrim(title)) between 1 and 120),
  destination    text,
  start_date     date,
  end_date       date,
  timezone       text not null default 'Asia/Taipei',
  summary        text,

  -- 分享連結
  share_token    text unique,                       -- null = 從未產生
  share_enabled  boolean not null default false,
  share_can_edit boolean not null default false,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint trips_date_order check (
    start_date is null or end_date is null or end_date >= start_date
  )
);

create index trips_owner_idx on public.trips (owner_id, start_date desc nulls last);
create index trips_share_idx on public.trips (share_token) where share_enabled;

create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- trip_days ----
create table public.trip_days (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  day_index  int  not null check (day_index >= 1),   -- 1-based
  date       date,                                    -- 由 start_date 推算
  title      text,                                    -- 例：「淺草・晴空塔」
  note       text,
  created_at timestamptz not null default now(),

  -- 重新編號（插入/刪除中間天）時需要延遲檢查，否則單一 UPDATE 會撞到唯一鍵
  constraint trip_days_index_uq unique (trip_id, day_index)
      deferrable initially deferred,

  -- 供 activities 建立複合外鍵，確保 day 與 activity 屬於同一趟旅遊
  constraint trip_days_id_trip_uq unique (id, trip_id)
);

create index trip_days_trip_idx on public.trip_days (trip_id, day_index);

-- ---------------------------------------------------------- activities ----
create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  day_id           uuid,                     -- NULL = 在「行程儲備區」
  position         int  not null default 0,  -- 同一容器內從 0 起連續遞增

  title            text not null check (length(btrim(title)) between 1 and 200),
  category         activity_category not null default 'other',
  start_time       time,
  duration_minutes int check (duration_minutes is null or duration_minutes between 1 and 10080),
  notes            text,
  links            jsonb not null default '[]'::jsonb
                     check (jsonb_typeof(links) = 'array'),

  -- 地點（Google Places 帶入或手動填）
  place_name       text,
  address          text,
  lat              double precision check (lat is null or lat between -90 and 90),
  lng              double precision check (lng is null or lng between -180 and 180),
  google_place_id  text,

  created_by       uuid references auth.users(id) on delete set null,  -- NULL = 分享連結匿名訪客
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- day 必須屬於同一趟旅遊；刪掉某天時該天行程自動退回儲備區（day_id -> NULL）
  constraint activities_day_fk foreign key (day_id, trip_id)
      references public.trip_days(id, trip_id) on delete set null (day_id),

  -- 供 images 建立複合外鍵
  constraint activities_id_trip_uq unique (id, trip_id),

  -- 座標必須成對出現
  constraint activities_latlng_pair check ((lat is null) = (lng is null))
);

create index activities_day_idx     on public.activities (trip_id, day_id, position);
create index activities_backlog_idx on public.activities (trip_id, position) where day_id is null;

create trigger activities_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- tags ----
-- 標籤 scope 在單趟旅遊內：RLS 最單純，分享連結的匿名訪客也能新增
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 24),
  color      text not null default 'slate',
  created_at timestamptz not null default now(),
  unique (trip_id, name)
);

create table public.activity_tags (
  activity_id uuid not null references public.activities(id) on delete cascade,
  tag_id      uuid not null references public.tags(id)       on delete cascade,
  primary key (activity_id, tag_id)
);

create index activity_tags_tag_idx on public.activity_tags (tag_id);

-- -------------------------------------------------------------- images ----
create table public.images (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  activity_id uuid,                               -- NULL = 屬於整趟旅遊
  role        image_role not null default 'info',

  path        text not null unique,               -- {trip_id}/{uuid}.webp
  thumb_path  text,                               -- {trip_id}/{uuid}_t.webp
  caption     text,
  width       int, height int, bytes int, mime text,
  position    int not null default 0,
  taken_at    timestamptz,

  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),

  constraint images_activity_fk foreign key (activity_id, trip_id)
      references public.activities(id, trip_id) on delete cascade
);

-- 封面唯一性：不用 activities.cover_image_id 欄位，避免循環外鍵與懸空指標。
-- 換封面 = 一次 UPDATE role。
create unique index images_activity_cover_uq on public.images (activity_id)
  where role = 'cover' and activity_id is not null;
create unique index images_trip_cover_uq on public.images (trip_id)
  where role = 'cover' and activity_id is null;

create index images_activity_idx on public.images (activity_id, role, position);
create index images_trip_idx     on public.images (trip_id, role, position);
