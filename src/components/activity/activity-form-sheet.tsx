'use client'

import { useState, useTransition } from 'react'
import { Loader2, MapPin, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { PlaceSearch, type PlaceResult } from '@/components/map/place-search'
import { TagPicker } from '@/components/activity/tag-picker'
import {
  PendingImagePicker,
  resolvePendingRoles,
  type PendingImage,
} from '@/components/image/pending-image-picker'
import { useImageUpload } from '@/lib/use-image-upload'
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
}: Omit<Props, 'open'>) {
  const mutations = useTripMutations()
  const { upload, progress } = useImageUpload()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>(() =>
    activity ? fromActivity(activity) : emptyState(),
  )
  const [localTags, setLocalTags] = useState<TagRow[]>(tags)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])

  const isEdit = Boolean(activity)
  const hasExistingCover = Boolean(
    activity?.images.some((i) => i.role === 'cover'),
  )
  const busy = pending || progress.uploading

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

      // 圖片要等行程存在之後才能上傳（images 的外鍵指向 activity）。
      // 先前只留住 File，到這裡才真正壓縮並直傳，中途取消就不會產生孤兒檔案。
      if (pendingImages.length) {
        const activityId =
          activity?.id ?? (typeof result.data === 'string' ? result.data : null)

        if (activityId) {
          await upload(
            pendingImages.map((p) => p.file),
            {
              activityId,
              role: 'info',
              roles: resolvePendingRoles(
                pendingImages.length,
                hasExistingCover,
              ),
            },
          )
        }
      }

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

          {form.times.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              班機、訂位、時段票、末班車…… 這些錯過會有代價的時間。
              一般行程不用填，靠順序就好。
            </p>
          ) : null}

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
            images={pendingImages}
            onChange={setPendingImages}
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
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="h-12 w-full text-base"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {progress.uploading
            ? `上傳圖片 ${progress.done}/${progress.total}`
            : isEdit
              ? '儲存'
              : '新增'}
        </Button>
      </div>
    </form>
  )
}
