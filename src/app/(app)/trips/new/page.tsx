import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { createTrip } from '@/actions/owner/trips'
import { TripForm } from '@/components/trip/trip-form'

export const metadata = { title: '新增旅遊' }

export default function NewTripPage() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md">
      <header className="pt-safe bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/trips"
            aria-label="返回"
            className="hover:bg-muted -ml-2 flex size-10 items-center justify-center rounded-full"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-semibold">新增旅遊</h1>
        </div>
      </header>

      <main className="px-5 py-6">
        <TripForm mode="create" action={createTrip} />
      </main>
    </div>
  )
}
