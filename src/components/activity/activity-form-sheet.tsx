'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Loader2, MapPin, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { PlaceSearch, type PlaceResult } from '@/components/map/place-search'
import { TagPicker } from '@/components/activity/tag-picker'
import { PendingImagePicker } from '@/components/image/pending-image-picker'
import { usePendingUploads } from '@/lib/use-pending-uploads'
import { useTripAccess } from '@/components/trip/trip-access'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/full-screen-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CATEGORIES } from '@/lib/constants'
import type { ActivityWithRelations } from '@/lib/queries'
import type { ActivityInput } from '@/lib/schemas'
import type {
  ActivityCategory,
  ActivityLink,
  ActivityTime,
  TagRow,
} from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'

/** 常見的重要時間，點一下就帶入名稱，省得每次打字 */
const TIME_LABEL_SUGGESTIONS = ['登機', '起飛', '抵達', '訂位', '入場', '集合']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = 新增到儲備區 */
  dayId: string | null
  /** 有值代表編輯既有行程 */
  activity?: ActivityWithRelations | null
  tags: TagRow[]
  placeSearchEnabled: boolean
  onSaved?: () => void
  /** 建立成功時把新行程交出去，讓列表可以先樂觀顯示 */
  onCreated?: (activity: ActivityWithRelations) => void
}

type FormState = {
  title: string
  category: ActivityCategory
  notes: string
  links: ActivityLink[]
  times: ActivityTime[]
  placeName: string
  address: string
  lat: number | null
  lng: number | null
  googlePlaceId: string | null
  tagIds: string[]
}

function emptyState(): FormState {
  return {
    title: '',
    category: 'other',
    notes: '',
    links: [],
    times: [],
    placeName: '',
    address: '',
    lat: null,
    lng: null,
    googlePlaceId: null,
    tagIds: [],
  }
}

function fromActivity(a: ActivityWithRelations): FormState {
  return {
    title: a.title,
    category: a.category,
    notes: a.notes ?? '',
    links: a.links ?? [],
    times: a.times ?? [],
    placeName: a.place_name ?? '',
    address: a.address ?? '',
    lat: a.lat,
    lng: a.lng,
    googlePlaceId: a.google_place_id,
    tagIds: a.tagIds,
  }
}

export function ActivityFormSheet({
  open,
  onOpenChange,
  dayId,
  activity,
  tags,
  placeSearchEnabled,
  onSaved,
  onCreated,
}: Props) {
  return (
    <FullScreenSheet
      open={open}
      onOpenChange={onOpenChange}
      title={activity ? '編輯行程' : dayId ? '新增行程' : '新增到儲備區'}
    >
      {/*
        用 key 讓表單在每次開啟（或切換編輯對象）時重新掛載，
        初始值直接由 useState 初始化函式帶入。
        這比在 effect 裡 setState 重設乾淨，也不會有串連渲染。
      */}
      <ActivityFormBody
        key={activity?.id ?? 'new'}
        dayId={dayId}
        activity={activity}
        tags={tags}
        placeSearchEnabled={placeSearchEnabled}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        onCreated={onCreated}
      />
    </FullScreenSheet>
  )
}

function ActivityFormBody({
  dayId,
  activity,
  tags,
  placeSearchEnabled,
  onOpenChange,
  onSaved,
  onCreated,
}: Omit<Props, 'open'>) {
  const mutations = useTripMutations()
  const { tripId } = useTripAccess()
  // 選好圖片就開始傳，不用等按下送出
  const uploads = usePendingUploads(tripId)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>(() =>
    activity ? fromActivity(activity) : emptyState(),
  )
  const [localTags, setLocalTags] = useState<TagRow[]>(tags)

  const isEdit = Boolean(activity)

  /*
    表單被關掉（而不是送出成功）時，把已經傳上去但沒用到的檔案刪掉。

    送出成功的路徑會先呼叫 clear(false) 清空清單，所以這裡不會誤刪 ——
    前提是那個清空要「同步」生效。usePendingUploads 內部的 itemsRef 因此
    在每個操作中直接更新，而不是靠 effect 同步；否則「清空」與「關閉表單」
    會被 React 批次成同一次 commit，同步用的 effect 來不及跑，這裡就會把
    剛提交成功的檔案刪掉。
  */
  const uploadsRef = useRef(uploads)
  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])
  useEffect(() => {
    return () => uploadsRef.current.clear(true)
  }, [])
  const hasExistingCover = Boolean(
    activity?.images.some((i) => i.role === 'cover'),
  )
  // 還有圖片在傳的話不讓送出 —— 送出去也寫不進 images
  const busy = pending || uploads.uploading

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function applyPlace(place: PlaceResult) {
    setForm((f) => ({
      ...f,
      // 標題還沒填的話直接用地點名稱，省一次打字
      title: f.title.trim() || place.placeName,
      placeName: place.placeName,
      address: place.address ?? '',
      lat: place.lat,
      lng: place.lng,
      googlePlaceId: place.googlePlaceId,
    }))
  }

  function clearPlace() {
    setForm((f) => ({
      ...f,
      placeName: '',
      address: '',
      lat: null,
      lng: null,
      googlePlaceId: null,
    }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('請輸入行程名稱')
      return
    }

    const input: ActivityInput = {
      title: form.title.trim(),
      category: form.category,
      notes: form.notes.trim() || null,
      links: form.links.filter((l) => l.url.trim()),
      times: form.times.filter((t) => t.time),
      place_name: form.placeName.trim() || null,
      address: form.address.trim() || null,
      lat: form.lat,
      lng: form.lng,
      google_place_id: form.googlePlaceId,
      tagIds: form.tagIds,
    }

    startTransition(async () => {
      const result = activity
        ? await mutations.updateActivity(activity.id, input)
        : await mutations.createActivity(dayId, input)

      if (!result.ok) {
        toast.error(isEdit ? '儲存失敗' : '新增失敗', {
          description: result.error,
        })
        return
      }

      // 檔案在選取當下就傳完了，這裡只要把資料列補上（外鍵需要 activity 先存在）
      const images = uploads.toCommitInputs(hasExistingCover)
      if (images.length) {
        const activityId =
          activity?.id ?? (typeof result.data === 'string' ? result.data : null)
        if (activityId) await mutations.commitImages(activityId, images)
      }

      // 先把卡片畫出來，不用等 router.refresh() 的那趟往返
      if (!activity && typeof result.data === 'string') {
        onCreated?.({
          ...input,
          id: result.data,
          trip_id: tripId,
          day_id: dayId,
          position: Number.MAX_SAFE_INTEGER,
          start_time: null,
          duration_minutes: null,
          notes: input.notes ?? null,
          place_name: input.place_name ?? null,
          address: input.address ?? null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          google_place_id: input.google_place_id ?? null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tagIds: input.tagIds ?? [],
          images: [],
        } as unknown as ActivityWithRelations)
      }

      // 這些檔案已經有 images 資料列指向了，不能當成廢棄檔案刪掉
      uploads.clear(false)

      toast.success(isEdit ? '已儲存' : '已新增行程')
      onOpenChange(false)
      onSaved?.()
    })
  }

  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
        {/* 地點搜尋：放最上面，因為選了地點就能自動帶入標題與座標 */}
        {placeSearchEnabled ? (
          <div className="space-y-2">
            <Label>地點</Label>
            {form.placeName || form.address ? (
              <div className="bg-muted flex items-start gap-2 rounded-lg p-3">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {form.placeName || '（未命名地點）'}
                  </p>
                  {form.address ? (
                    <p className="text-muted-foreground text-xs">
                      {form.address}
                    </p>
                  ) : null}
                  {form.lat === null ? (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                      沒有座標，不會顯示在地圖上
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={clearPlace}
                  aria-label="清除地點"
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ) : (
              /*
                    直接顯示搜尋框，不要再包一層「搜尋地點」按鈕。
                    包按鈕的話要點兩次（先展開、再聚焦）才能開始打字，而且
                    Google 的 script 要等展開後才開始載入，第一次點下去往往
                    還沒就緒。直接渲染的話表單一開啟就開始載入。
                  */
              <PlaceSearch onSelect={applyPlace} enabled={placeSearchEnabled} />
            )}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="act-title">行程名稱</Label>
          <Input
            id="act-title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="例：淺草寺"
            maxLength={200}
            required
            className="h-11 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label>分類</Label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const active = form.category === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => set('category', cat.value)}
                  aria-pressed={active}
                  className={`flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-xs transition-colors ${
                    active
                      ? 'border-foreground bg-muted font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/*
              重要時間。不是排時刻表，而是記下「你無法控制」的時間：
              班機、訂位、時段票、末班車。所以做成可命名的清單而不是單一
              欄位 —— 一個行程可能同時有起飛和抵達兩個時間。
            */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>重要時間</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                set('times', [...form.times, { label: '', time: '' }])
              }
            >
              <Plus className="size-4" aria-hidden />
              加一個
            </Button>
          </div>

          {form.times.map((entry, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  value={entry.label}
                  onChange={(e) => {
                    const next = [...form.times]
                    next[index] = { ...entry, label: e.target.value }
                    set('times', next)
                  }}
                  placeholder="名稱"
                  maxLength={20}
                  className="h-10 w-24 shrink-0"
                />
                <Input
                  type="time"
                  value={entry.time}
                  onChange={(e) => {
                    const next = [...form.times]
                    next[index] = { ...entry, time: e.target.value }
                    set('times', next)
                  }}
                  className="h-10 text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0"
                  aria-label="移除這個時間"
                  onClick={() =>
                    set(
                      'times',
                      form.times.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>

              {/* 名稱還沒填時給幾個常見的，點一下帶入 */}
              {!entry.label ? (
                <div className="flex flex-wrap gap-1 pl-0.5">
                  {TIME_LABEL_SUGGESTIONS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const next = [...form.times]
                        next[index] = { ...entry, label }
                        set('times', next)
                      }}
                      className="text-muted-foreground hover:text-foreground rounded-full border border-dashed px-2 py-0.5 text-[11px]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>標籤</Label>
          <TagPicker
            tags={localTags}
            selected={form.tagIds}
            onChange={(ids) => set('tagIds', ids)}
            onTagCreated={(tag) =>
              setLocalTags((prev) => [
                ...prev,
                {
                  id: tag.id,
                  name: tag.name,
                  color: tag.color,
                  trip_id: '',
                  created_at: '',
                },
              ])
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>連結</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                set('links', [...form.links, { label: '', url: '' }])
              }
            >
              <Plus className="size-4" aria-hidden />
              加一個
            </Button>
          </div>
          {form.links.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              官網、訂位頁面、參考文章…
            </p>
          ) : null}
          {form.links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={link.label}
                onChange={(e) => {
                  const next = [...form.links]
                  next[index] = { ...link, label: e.target.value }
                  set('links', next)
                }}
                placeholder="標題"
                maxLength={40}
                className="h-10 w-24 shrink-0"
              />
              <Input
                value={link.url}
                onChange={(e) => {
                  const next = [...form.links]
                  next[index] = { ...link, url: e.target.value }
                  set('links', next)
                }}
                placeholder="https://"
                inputMode="url"
                className="h-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 shrink-0"
                aria-label="移除這個連結"
                onClick={() =>
                  set(
                    'links',
                    form.links.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>圖片</Label>
          <PendingImagePicker
            items={uploads.items}
            onAdd={uploads.add}
            onRemove={uploads.remove}
            onReorder={uploads.reorder}
            hasExistingCover={hasExistingCover}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="act-notes">備註</Label>
          <Textarea
            id="act-notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="訂位編號、開放時間、要注意的事…"
            rows={4}
            maxLength={5000}
            className="text-base"
          />
        </div>
      </div>

      <div className="pb-safe border-t px-4 py-3">
        {/*
          按鈕的文字固定不變。之前上傳時會換成「圖片上傳中…」，寬度一改
          整顆按鈕就跳動一下，看起來像閃爍。改成只在左側補一個轉圈圖示，
          並用 transition 讓停用時的淡化平順帶過。
        */}
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="h-12 w-full text-base transition-opacity"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {isEdit ? '儲存' : '新增'}
        </Button>
      </div>
    </form>
  )
}
