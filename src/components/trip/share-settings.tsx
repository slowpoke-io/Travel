'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { Check, Copy, Link2, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { updateShareSettings } from '@/actions/owner/trips'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

/**
 * 分享設定。
 *
 * 「允許他人編輯」隨時可以關掉 —— 關掉之後，即使別人的分頁還開著，
 * 下一次送出任何編輯都會被 server 端擋下（見 lib/share/guard.ts）。
 */
export function ShareSettings({
  tripId,
  initialToken,
  initialEnabled,
  initialCanEdit,
}: {
  tripId: string
  initialToken: string | null
  initialEnabled: boolean
  initialCanEdit: boolean
}) {
  const [token, setToken] = useState(initialToken)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [canEdit, setCanEdit] = useState(initialCanEdit)
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)

  /*
    網址的 origin。

    原本寫 `typeof window !== 'undefined'`，那會讓伺服器渲染出「沒有連結」、
    client 第一次渲染卻是「有連結」—— 兩邊對不起來就是 hydration error
    （React #418），而且只有在真的產生過分享連結時才會發生。

    useSyncExternalStore 就是為這種「server 與 client 有不同快照」的值準備的：
    伺服器端用 null，hydrate 完成後 React 自己換成真正的 origin。
    origin 在頁面生命週期內不會變，所以訂閱函式什麼都不用做。
  */
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => null,
  )

  const shareUrl = token && origin ? `${origin}/s/${token}` : null

  async function apply(
    next: { enabled: boolean; canEdit: boolean; regenerate?: boolean },
    successMessage: string,
  ) {
    const result = await updateShareSettings(tripId, next)
    if (!result.ok) {
      // 失敗時把 UI 復原成先前的狀態
      setEnabled(enabled)
      setCanEdit(canEdit)
      toast.error('設定失敗', { description: result.error })
      return false
    }
    setToken(result.data.token)
    setEnabled(result.data.enabled)
    setCanEdit(result.data.canEdit)
    toast.success(successMessage)
    return true
  }

  /* 開關切換走 transition；重新產生連結的等待狀態由 ConfirmDialog 自己顯示 */
  function save(
    next: { enabled: boolean; canEdit: boolean; regenerate?: boolean },
    successMessage: string,
  ) {
    startTransition(async () => {
      await apply(next, successMessage)
    })
  }

  async function copy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('已複製連結')
    } catch {
      toast.error('複製失敗，請手動選取網址')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <div className="min-w-0 flex-1">
          <Label htmlFor="share-enabled" className="text-sm font-medium">
            開啟分享連結
          </Label>
        </div>
        <Switch
          id="share-enabled"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(v) => {
            setEnabled(v)
            save(
              { enabled: v, canEdit: v ? canEdit : false },
              v ? '已開啟分享' : '已關閉分享，原連結立即失效',
            )
          }}
        />
      </div>

      {enabled ? (
        <>
          <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor="share-edit" className="text-sm font-medium">
                允許他人編輯
              </Label>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                開啟後，不用帳號也能新增、編輯、排序行程與上傳圖片。
                <br />
                但仍<strong>不能</strong>更改旅遊名稱、日期、天數或分享設定。
              </p>
            </div>
            <Switch
              id="share-edit"
              checked={canEdit}
              disabled={pending}
              onCheckedChange={(v) => {
                setCanEdit(v)
                save(
                  { enabled: true, canEdit: v },
                  v ? '已開放編輯' : '已改為唯讀',
                )
              }}
            />
          </div>

          {shareUrl ? (
            <div className="space-y-2 rounded-xl border p-4">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Link2 className="size-4" aria-hidden />
                分享連結
              </Label>
              <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 font-mono text-xs break-all">
                {shareUrl}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copy}
                  className="flex-1 gap-1.5"
                >
                  {copied ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                  {copied ? '已複製' : '複製連結'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirmRegen(true)}
                  className="gap-1.5"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden />
                  )}
                  換新連結
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title="換一組新連結？"
        description="目前的連結會立刻失效，已經分享出去的人將無法再開啟。"
        confirmLabel="換新連結"
        onConfirm={() =>
          apply(
            { enabled: true, canEdit, regenerate: true },
            '已產生新連結，舊連結已失效',
          )
        }
      />
    </div>
  )
}
