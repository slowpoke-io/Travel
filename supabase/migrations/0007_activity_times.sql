-- =============================================================================
-- 0007_activity_times.sql — 以「重要時間」清單取代單一的開始時間與停留時間
--
-- 原本每個行程都有一個 start_time，等於鼓勵使用者排一張不會遵守的時刻表：
-- 早上塞車遲了 40 分鐘，後面每一格就全錯，畫面上卻還顯示著錯的資訊。
-- 而且它讓「飛機 09:15」和「大概下午去」長得一模一樣。
--
-- 真正需要記的是你「無法控制」的時間：班機、訂位、時段票、末班車。
-- 這些數量不固定、而且需要說明是什麼時間，所以改成跟 links 一樣的
-- 可命名清單：[{ "label": "登機", "time": "08:30" }, ...]
--
-- duration_minutes 一併移除 —— 它只有在排時刻表時才有意義。
-- =============================================================================

alter table public.activities
  add column times jsonb not null default '[]'::jsonb
    check (jsonb_typeof(times) = 'array');

-- 既有的 start_time 轉成清單裡的第一筆，避免資料消失
update public.activities
   set times = jsonb_build_array(
         jsonb_build_object('label', '時間', 'time', to_char(start_time, 'HH24:MI'))
       )
 where start_time is not null;

alter table public.activities drop column start_time;
alter table public.activities drop column duration_minutes;
