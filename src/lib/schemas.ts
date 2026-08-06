import { z } from 'zod'

const CATEGORY_VALUES = [
  'sight',
  'food',
  'lodging',
  'transport',
  'shopping',
  'other',
] as const

const trimmed = (max: number) => z.string().trim().max(max)

export const linkSchema = z.object({
  label: trimmed(40),
  url: z.string().trim().url('請輸入有效的網址').max(2000),
})

export const activityInputSchema = z.object({
  title: trimmed(200).min(1, '請輸入行程名稱'),
  category: z.enum(CATEGORY_VALUES).default('other'),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '時間格式應為 HH:MM')
    .nullable()
    .optional(),
  duration_minutes: z
    .number()
    .int()
    .min(1)
    .max(10080)
    .nullable()
    .optional(),
  notes: trimmed(5000).nullable().optional(),
  links: z.array(linkSchema).max(10).default([]),
  place_name: trimmed(200).nullable().optional(),
  address: trimmed(400).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  google_place_id: trimmed(200).nullable().optional(),
  tagIds: z.array(z.string().uuid()).max(20).default([]),
})

export type ActivityInput = z.infer<typeof activityInputSchema>

export const tripInputSchema = z
  .object({
    title: trimmed(120).min(1, '請輸入旅遊名稱'),
    destination: trimmed(120).nullable().optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    timezone: trimmed(64).default('Asia/Taipei'),
    summary: trimmed(2000).nullable().optional(),
  })
  .refine(
    (v) => !v.start_date || !v.end_date || v.end_date >= v.start_date,
    { message: '結束日期不能早於開始日期', path: ['end_date'] },
  )
  .refine(
    (v) => {
      if (!v.start_date || !v.end_date) return true
      const days =
        (Date.parse(v.end_date) - Date.parse(v.start_date)) / 86_400_000 + 1
      return days <= 60
    },
    { message: '單趟旅遊最多 60 天', path: ['end_date'] },
  )

export type TripInput = z.infer<typeof tripInputSchema>

export const tagInputSchema = z.object({
  name: trimmed(24).min(1, '請輸入標籤名稱'),
  color: trimmed(16).default('slate'),
})

export const reorderSchema = z.object({
  dayId: z.string().uuid().nullable(),
  ids: z.array(z.string().uuid()).max(300),
})

/** '' 一律轉成 null，避免空字串寫進資料庫 */
export function emptyToNull(value: string | null | undefined): string | null {
  const v = value?.trim()
  return v ? v : null
}
