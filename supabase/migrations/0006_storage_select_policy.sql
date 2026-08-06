-- =============================================================================
-- 0006_storage_select_policy.sql — 補上 storage 的 SELECT 政策
--
-- 0004 只建了 INSERT / UPDATE / DELETE 政策，漏了 SELECT。
--
-- 後果是刪圖時檔案不會真的被刪掉：Supabase 的 storage.remove() 會先 SELECT
-- 找出符合的物件再刪除，沒有 SELECT 權限就一筆都找不到，於是「刪掉 0 個檔案」
-- —— 而且它不會報錯，只回傳一個空陣列。資料表的那一列被刪了，Storage 裡的
-- 檔案卻留下來變成孤兒，長期下來會吃掉儲存空間。
--
-- bucket 是公開讀取的，但那只影響「用網址直接取圖」這條路徑；
-- 透過 API 操作 storage.objects（list / remove）仍然受 RLS 管轄。
-- =============================================================================

create policy "trip-media: owner select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'trip-media'
    and public.is_trip_owner(((storage.foldername(name))[1])::uuid)
  );
