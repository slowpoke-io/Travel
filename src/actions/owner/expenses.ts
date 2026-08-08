'use server'

import { revalidatePath } from 'next/cache'

import { failFrom, ok, fail, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import * as core from '@/lib/mutations/expenses'
import {
  commitImages as commitImagesCore,
  removeStorageObjects,
  type CommitImageInput,
} from '@/lib/mutations/images'
import {
  expenseInputSchema,
  tripCurrencySchema,
  type ExpenseInput,
  type TripCurrencyInput,
} from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

/**
 * 花費操作。
 *
 * 刻意「只有」擁有者版本，沒有 actions/share/expenses.ts ——
 * 分享連結的訪客連讀都要擁有者逐趟開啟（見 trip-context.ts），寫入一律不開放。
 * 「訪客能不能改花費」因此是靠「這個檔案不存在對應版本」來保證的，
 * 不會因為某天改了某個條件判斷而不小心放寬。
 */
async function ownerContext(tripId: string) {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('TRIP_NOT_FOUND')

  return { user, supabase }
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/trips/${tripId}`, 'layout')
}

export async function createExpense(
  tripId: string,
  input: ExpenseInput,
): Promise<ActionResult<string>> {
  try {
    const parsed = expenseInputSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }

    const { user, supabase } = await ownerContext(tripId)
    const id = await core.createExpense(supabase, {
      tripId,
      input: parsed.data,
      createdBy: user.id,
    })
    revalidateTrip(tripId)
    return ok(id)
  } catch (e) {
    return failFrom('createExpense', e)
  }
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<ActionResult> {
  try {
    const parsed = expenseInputSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }

    const { supabase } = await ownerContext(tripId)
    await core.updateExpense(supabase, {
      tripId,
      expenseId,
      input: parsed.data,
    })
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('updateExpense', e)
  }
}

export async function deleteExpense(
  tripId: string,
  expenseId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await ownerContext(tripId)
    // 先拿到收據路徑再刪資料列，否則 cascade 之後就查不到檔案了
    const orphanPaths = await core.deleteExpense(supabase, { tripId, expenseId })
    await removeStorageObjects(supabase, orphanPaths)
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('deleteExpense', e)
  }
}

/**
 * 把已經傳到 Storage 的花費圖片寫進 images。
 *
 * 跟行程的圖片走同一套「先傳檔、送出時才寫資料列」流程，
 * 只是掛在 expense 而不是 activity 上。
 */
export async function commitExpenseImages(
  tripId: string,
  expenseId: string,
  images: CommitImageInput[],
): Promise<ActionResult> {
  try {
    const { user, supabase } = await ownerContext(tripId)
    await commitImagesCore(supabase, {
      tripId,
      activityId: null,
      expenseId,
      images,
      createdBy: user.id,
    })
    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('commitExpenseImages', e)
  }
}

/** 旅遊的幣別與匯率設定 */
export async function updateTripCurrency(
  tripId: string,
  input: TripCurrencyInput,
): Promise<ActionResult> {
  try {
    const parsed = tripCurrencySchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '輸入內容有誤')
    }

    const { supabase } = await ownerContext(tripId)
    const { error } = await supabase
      .from('trips')
      .update({
        home_currency: parsed.data.home_currency,
        local_currency: parsed.data.local_currency ?? null,
        fx_rate: parsed.data.fx_rate ?? null,
      })
      .eq('id', tripId)
    if (error) throw error

    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('updateTripCurrency', e)
  }
}

/** 分享連結要不要顯示花費 */
export async function setShareShowExpenses(
  tripId: string,
  show: boolean,
): Promise<ActionResult> {
  try {
    const { supabase } = await ownerContext(tripId)
    const { error } = await supabase
      .from('trips')
      .update({ share_show_expenses: show })
      .eq('id', tripId)
    if (error) throw error

    revalidateTrip(tripId)
    return ok()
  } catch (e) {
    return failFrom('setShareShowExpenses', e)
  }
}
