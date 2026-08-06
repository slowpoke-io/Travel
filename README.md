# 旅程 · 旅遊規劃與紀錄

以手機使用為主的旅遊規劃 App。Google 登入後管理多趟旅遊，每趟旅遊有「行程儲備區」放還沒排定的地點，可以方便地丟到某一天；每天的行程能拖曳排序、在地圖上看到順序，並上傳圖片作為封面／資訊／旅遊紀錄。

**技術**：Next.js 16（App Router）· Tailwind v4 · shadcn/ui · Supabase（Postgres + Auth + Storage + RLS）· dnd-kit · Google Maps · PWA

---

## 快速開始

```bash
npm install
cp .env.example .env.local     # 填入下方步驟取得的值
npm run dev                    # http://localhost:3000
```

沒有填 Google Maps 金鑰也能跑 —— 地圖區塊會顯示提示，地點改為手動輸入，其餘功能完全正常。
但 **Supabase 的三個變數是必填的**，否則啟動後會看到「尚未完成設定」的畫面。

---

## 環境設定

### 1. Supabase

1. 到 [supabase.com](https://supabase.com) → **New project**，區域選離你最近的（台灣選東京 `ap-northeast-1`）
2. **Project Settings → API**，記下三個值填進 `.env.local`：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role / secret key → `SUPABASE_SERVICE_ROLE_KEY`（**絕不可加 `NEXT_PUBLIC_` 前綴**）
3. **Authentication → URL Configuration**
   - Site URL：`http://localhost:3000`
   - Redirect URLs 加入 `http://localhost:3000/**`（之後再加正式網域）

### 2. 套用資料庫 migration

```bash
npx supabase login
npx supabase link --project-ref <你的 project ref>
npx supabase db push
```

這會建立 7 張表、RLS policy、RPC 與 `trip-media` 儲存空間。

> 也可以手動把 `supabase/migrations/` 底下四個 `.sql` **依序**貼進 Supabase SQL Editor 執行。

### 3. Google 登入

1. [Google Cloud Console](https://console.cloud.google.com) → 建立專案
2. **API 和服務 → OAuth 同意畫面**：選「外部」，填應用程式名稱與支援信箱
3. **憑證 → 建立憑證 → OAuth 2.0 用戶端 ID → 網頁應用程式**
4. 「已授權的重新導向 URI」填：
   ```
   https://<你的 project-ref>.supabase.co/auth/v1/callback
   ```
5. 把 Client ID 與 Client Secret 貼回 Supabase 的
   **Authentication → Providers → Google**，並啟用

### 4. Google Maps（選填但建議）

1. 同一個 Google Cloud 專案 → **API 和服務 → 程式庫**，啟用這兩個：
   - **Maps JavaScript API**
   - **Places API (New)** ← 要新版。舊的 `places.Autocomplete` 自 2025-03 起不開放新客戶
2. **憑證 → 建立憑證 → API 金鑰** → 填入 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. **一定要設定金鑰限制**（這個金鑰會出現在前端原始碼中）：
   - 應用程式限制：**HTTP 參照網址** → `http://localhost:3000/*` 與正式網域
   - API 限制：只勾上面那兩個 API
4. **Google Maps Platform → 地圖管理 → 建立地圖 ID**
   （類型 **JavaScript**、**向量**）→ 填入 `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`

   有編號的地圖標記（AdvancedMarker）需要 Map ID，沒有的話標記不會出現。

5. 需要綁信用卡，但有每月免費額度，個人使用幾乎不會超過。

---

## 手機實測

```bash
npm run dev -- -H 0.0.0.0     # 手機連同一 Wi-Fi，開 http://<電腦IP>:3000
```

**Google 登入與 PWA 安裝需要 HTTPS**，本機 IP 不行。要測完整流程時：

```bash
npx localtunnel --port 3000   # 或 ngrok http 3000
```

再把產生的網址加進：

- Supabase → Authentication → Redirect URLs
- Google Maps API 金鑰的 HTTP 參照網址限制

---

## 專案結構

```
supabase/migrations/         0001 schema · 0002 RLS · 0003 RPC · 0004 storage
src/
  proxy.ts                   Supabase session 更新（Next 16 把 middleware 改名為 proxy）
  app/
    (app)/trips/…            擁有者路徑（需登入）
    s/[token]/…              分享路徑（不需登入，唯讀或可編輯）
    auth/callback            Google OAuth code exchange
  actions/
    owner/                   擁有者專用 Server Actions
    share/                   匿名訪客的白名單 Server Actions
  lib/
    supabase/                client（瀏覽器）· server（RSC）· admin（service role）
    mutations/               共用的異動邏輯，client 由呼叫端注入
    share/guard.ts           分享 token 驗證
    use-trip-mutations.ts    依存取模式分派到 owner 或 guest action
  components/
    activity/                卡片 · 表單 · 排序模式 · 移動到…
    trip/                    外框 · 導覽 · 每日檢視 · 儲備區 · 設定
    map/  image/             地圖與圖片
scripts/cleanup-orphan-media.ts
```

---

## 幾個設計決策

**行程儲備區用 `day_id IS NULL` 表示**，而不是另一張表。
搬移只是改一個欄位，不需要跨表同步。複合外鍵 `(day_id, trip_id)` 保證行程不會跑到別趟旅遊的某天，
而 `ON DELETE SET NULL (day_id)` 讓「刪掉一天」時該天行程自動退回儲備區，不會靜默消失。

**排序不用 fractional index**，改成拖曳完成時把整個容器的 id 順序送給 `reorder_activities` RPC，
`position` 直接等於陣列索引。單日行程量小（通常 < 20），這樣永遠不會出現順序漂移。

**封面用 `role` + partial unique index**，而不是在 `activities` 上放 `cover_image_id`。
避免循環外鍵與懸空指標，換封面只要 update 一列。

**Storage bucket 是公開讀取的**（路徑含隨機 UUID）。
需求同時要「公開分享連結」與「PWA 離線看圖」，私有 bucket 的簽名 URL 每小時會換，
會讓 Service Worker 快取失效、分享頁也要多一層代簽。代價是拿到 URL 的人就看得到圖 ——
對旅遊照片而言可接受。要改成私有的話只需替換 `src/lib/image-url.ts` 的 `getImageUrl()`。

**分享連結不走 RLS**。匿名訪客沒有 Supabase session，無法靠 RLS 授權，
所以由 server 端驗證 token 後改用 service role 操作，`anon` role 在所有表上都是預設拒絕。
訪客「不能改旅遊名稱／日期／天數／分享設定」是靠 `actions/share/` 底下**沒有那些函式**來保證，
而不是靠條件式判斷 —— 之後改動條件也不會意外放寬權限。

---

## 指令

```bash
npm run dev         # 開發
npm run build       # 正式建置（含產生 Service Worker）
npm run start       # 跑正式建置
npm run typecheck   # 型別檢查
npm run lint

# 清理 Storage 中沒有資料列指向的孤兒檔案
set -a && source .env.local && set +a
npx tsx scripts/cleanup-orphan-media.ts          # 預覽
npx tsx scripts/cleanup-orphan-media.ts --delete # 實際刪除
```

---

## 離線範圍

PWA 的離線支援限於**已瀏覽過的頁面與圖片可以再看一次**。
離線編輯需要本地資料庫與衝突合併，不在這一版範圍內 —— 斷線時的新增／編輯會失敗並跳出提示。
