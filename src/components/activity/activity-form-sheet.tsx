'use client'

import { useState, useTransition } from 'react'
import { Loader2, MapPin, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { PlaceSearch, type PlaceResult } from '@/components/map/place-search'
import { TagPicker } from '@/components/activity/tag-picker'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CATEGORIES } from '@/lib/constants'
import type { ActivityWithRelations } from '@/lib/queries'
import type { ActivityInput } from '@/lib/schemas'
import type {
  ActivityCategory,
  ActivityLink,
  TagRow,
} from '@/lib/supabase/database.types'
import { useTripMutations } from '@/lib/use-trip-mutations'

const DURATION_PRESETS = [30, 60, 90, 120, 180, 240]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = 新增到儲備區 */
  dayId: string | null
  /** 有值代表編輯既有行程 */
  activity?: ActivityWithRelations | null
  tags: TagRow[]
  mapsEnabled: boolean
  onSaved?: () => void
}

type FormState = {
  title: string
  category: ActivityCategory
  startTime: string
  duration: string
  notes: string
  links: ActivityLink[]
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
    startTime: '',
    duration: '',
    notes: '',
    links: [],
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
    startTime: a.start_time?.slice(0, 5) ?? '',
    duration: a.duration_minutes?.toString() ?? '',
    notes: a.notes ?? '',
    links: a.links ?? [],
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
  mapsEnabled,
  onSaved,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92dvh]">
        <DrawerHeader className="border-b py-3">
          <DrawerTitle className="text-base">
            {activity ? '編輯行程' : dayId ? '新增行程' : '新增到儲備區'}
          </DrawerTitle>
        </DrawerHeader>

        {/*
          用 key 讓表單在每次開啟（或切換編輯對象）時重新掛載，
          初始值直接由 useState 初始化函式帶入。
          這比在 effect 裡 setState 重設乾淨，也不會有串連渲染。
        */}
        {open ? (
          <ActivityFormBody
            key={activity?.id ?? 'new'}
            dayId={dayId}
            activity={activity}
            tags={tags}
            mapsEnabled={mapsEnabled}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function ActivityFormBody({
  dayId,
  activity,
  tags,
  mapsEnabled,
  onOpenChange,
  onSaved,
}: Omit<Props, 'open'>) {
  const mutations = useTripMutations()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>(() =>
    activity ? fromActivity(activity) : emptyState(),
  )
  const [localTags, setLocalTags] = useState<TagRow[]>(tags)
  const [searchOpen, setSearchOpen] = useState(false)

  const isEdit = Boolean(activity)

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
    setSearchOpen(false)
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
      start_time: form.startTime || null,
      duration_minutes: form.duration ? Number(form.duration) : null,
      notes: form.notes.trim() || null,
      links: form.links.filter((l) => l.url.trim()),
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
            {mapsEnabled ? (
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
                ) : searchOpen ? (
                  <PlaceSearch onSelect={applyPlace} />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSearchOpen(true)}
                    className="h-11 w-full justify-start gap-2 font-normal"
                  >
                    <Search className="size-4" aria-hidden />
                    <span className="text-muted-foreground">搜尋地點</span>
                  </Button>
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

            {dayId ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="act-time">開始時間</Label>
                  <Input
                    id="act-time"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => set('startTime', e.target.value)}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="act-duration">停留時間</Label>
                  <Select
                    value={form.duration || 'none'}
                    onValueChange={(v) => set('duration', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger id="act-duration" className="h-11 w-full">
                      <SelectValue placeholder="未設定" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">未設定</SelectItem>
                      {DURATION_PRESETS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m >= 60
                            ? `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分` : ''}`
                            : `${m} 分`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

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
          disabled={pending}
          className="h-12 w-full text-base"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {isEdit ? '儲存' : '新增'}
        </Button>
      </div>
    </form>
  )
}
