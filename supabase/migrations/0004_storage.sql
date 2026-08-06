-- =============================================================================
-- 0004_storage.sql — 圖片儲存空間
--
-- Bucket 設為「公開讀取」是刻意的取捨：
--   需求同時要「公開分享連結」與「PWA 離線可看圖」。私有 bucket 的簽名 URL 每
--   小時會換，Service Worker 快取會失效，分享頁也要多一層代簽機制。
--   公開 bucket + 不可猜測的 UUID 路徑 → URL 穩定、可永久快取、分享頁零成本。
--   代價是拿到 URL 的人就看得到圖，對旅遊照片而言可接受。
--   日後要改私有只需替換 src/lib/images.ts 的 getImageUrl()。
--
-- 寫入權限仍受保護：路徑第一段是 trip_id，policy 檢查該 trip 是否屬於當前使用者。
-- 匿名訪客的上傳走 server 端簽名上傳 URL（service role），不經過這些 policy。
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-media',
  'trip-media',
  true,
  10485760,                                   -- 10MB（前端已壓縮，這是保險上限）
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "trip-media: owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trip-media'
    and public.is_trip_owner(((storage.foldername(name))[1])::uuid)
  );

create policy "trip-media: owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'trip-media'
    and public.is_trip_owner(((storage.foldername(name))[1])::uuid)
  );

create policy "trip-media: owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trip-media'
    and public.is_trip_owner(((storage.foldername(name))[1])::uuid)
  );
