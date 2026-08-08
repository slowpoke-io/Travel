-- =============================================================================
-- 0009_expenses.sql — 花費紀錄
--
-- 為什麼花費不掛在 activities 底下：
--
-- activities 是「地點」，expenses 是「付款」，兩者不是一對一。那碗拉麵對得到
-- 行程，但 ATM 手續費、兩個景點之間的計程車、機場買的伴手禮都對不到任何地點。
-- 所以花費屬於整趟旅遊，再「可選擇性地」掛到某一天、某個行程。
--
-- 幣別的處理原則：存原始金額 + 當下的匯率，換算值用 generated column 算出來。
-- 絕對不要只存換算後的數字 —— 收據上寫的是 ₩12,000，之後匯率變了還是要對得
-- 起來。金額一律用 numeric，不用浮點數。
-- =============================================================================

-- --------------------------------------------------------------- trips ----
alter table public.trips
  -- 結算幣別：所有統計換算到它
  add column home_currency  char(3) not null default 'TWD'
    check (home_currency ~ '^[A-Z]{3}$'),
  -- 這趟主要花費的幣別（去韓國就是 KRW）。null = 只花結算幣別
  add column local_currency char(3)
    check (local_currency is null or local_currency ~ '^[A-Z]{3}$'),
  -- 1 個 local_currency 等於幾個 home_currency
  add column fx_rate        numeric(18,8)
    check (fx_rate is null or fx_rate > 0),
  -- 分享連結看不看得到花費。預設關閉 —— 錢比行程敏感，而連結可能被轉傳
  add column share_show_expenses boolean not null default false;

-- ------------------------------------------------------------ expenses ----
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  day_id      uuid,   -- NULL = 未指定日期
  activity_id uuid,   -- NULL = 沒有對應到特定地點

  title       text check (title is null or length(btrim(title)) <= 200),
  category    expense_category not null default 'other',

  amount      numeric(14,2) not null check (amount >= 0),
  currency    char(3) not null check (currency ~ '^[A-Z]{3}$'),
  -- 建立當下的匯率快照。之後改整趟的匯率不會追溯改到舊帳
  rate        numeric(18,8) not null default 1 check (rate > 0),
  amount_home numeric(14,2)
    generated always as (round(amount * rate, 2)) stored,

  spent_at    date,
  note        text,

  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- day 必須屬於同一趟旅遊；刪掉某天時該天的花費退回「未指定」而不是消失
  constraint expenses_day_fk foreign key (day_id, trip_id)
      references public.trip_days(id, trip_id) on delete set null (day_id),

  -- activity 也必須屬於同一趟旅遊；刪掉行程時花費留著，只是不再連到地點
  constraint expenses_activity_fk foreign key (activity_id, trip_id)
      references public.activities(id, trip_id) on delete set null (activity_id),

  -- 供 images 建立複合外鍵
  constraint expenses_id_trip_uq unique (id, trip_id)
);

create index expenses_trip_idx     on public.expenses (trip_id, spent_at desc nulls last, created_at desc);
create index expenses_day_idx      on public.expenses (trip_id, day_id);
create index expenses_activity_idx on public.expenses (activity_id) where activity_id is not null;

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- images ----
-- 花費的圖片沿用現成的 images 表，而不是另開一張。
--
-- 上傳、預先上傳、進度、刪除、孤兒清理、刪旅遊時連檔案一起刪 —— 這整套已經
-- 踩過不少坑才修對（storage.remove() 靜默失敗、刪除順序造成檔案殘留）。
-- 另開一張表等於把那些坑再走一次。
--
-- role 用 0008 加的 'receipt'（語意是「屬於某筆花費的圖片」，見該檔說明）。
alter table public.images
  add column expense_id uuid,
  add constraint images_expense_fk foreign key (expense_id, trip_id)
      references public.expenses(id, trip_id) on delete cascade,
  -- 一張圖只能屬於一個東西：行程、花費、或整趟旅遊
  add constraint images_single_owner
      check (activity_id is null or expense_id is null);

create index images_expense_idx on public.images (expense_id, position)
  where expense_id is not null;

-- 既有的 images_trip_cover_uq 是 `where role = 'cover' and activity_id is null`。
-- 花費的圖片 role 是 'receipt'，不會落進這個條件，旅遊封面的唯一性不受影響。

-- ----------------------------------------------------------------- RLS ----
alter table public.expenses enable row level security;

create policy "expenses: owner all" on public.expenses for all to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));

-- -------------------------------------------------------------- grants ----
grant select, insert, update, delete on public.expenses
  to authenticated, service_role;

revoke all on public.expenses from anon;
