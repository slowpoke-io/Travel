import { requireUserOrRedirect } from '@/lib/auth'

/**
 * 需登入的區塊。未登入一律導向 /login。
 *
 * 這只是第一道防線 —— 真正的資料隔離靠 Supabase RLS，
 * 每個 Server Action 也會各自再驗一次權限。
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUserOrRedirect()
  return children
}
