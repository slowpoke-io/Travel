import Link from 'next/link'
import { Luggage, Plus } from 'lucide-react'

import { AccountMenu } from '@/components/trip/account-menu'
import { TripCard } from '@/components/trip/trip-card'
import { Button } from '@/components/ui/button'
import { requireUserOrRedirect } from '@/lib/auth'
import { PHASE_LABEL, tripPhase, type TripPhase } from '@/lib/format'
import { loadTripList, type TripListItem } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '我的旅遊' }

const SECTION_ORDER: TripPhase[] = ['ongoing', 'upcoming', 'undated', 'past']

export default async function TripsPage() {
  const user = await requireUserOrRedirect('/trips')
  const supabase = await createClient()
  const trips = await loadTripList(supabase, user.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle()

  const grouped = new Map<TripPhase, TripListItem[]>()
  for (const trip of trips) {
    const phase = tripPhase(trip)
    const list = grouped.get(phase)
    if (list) list.push(trip)
    else grouped.set(phase, [trip])
  }
  // 已結束的旅遊由近到遠
  grouped.get('past')?.reverse()

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md">
      <header className="pt-safe bg-background/90 sticky top-0 z-10 backdrop-blur">
        <div className="flex items-center justify-between px-5 py-4">
          <h1 className="text-2xl font-bold tracking-tight">我的旅遊</h1>
          <AccountMenu
            displayName={profile?.display_name ?? null}
            email={profile?.email ?? user.email ?? null}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </div>
      </header>

      <main className="px-5 pb-32">
        {trips.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {SECTION_ORDER.map((phase) => {
              const list = grouped.get(phase)
              if (!list?.length) return null
              return (
                <section key={phase}>
                  <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                    {PHASE_LABEL[phase]}（{list.length}）
                  </h2>
                  <div className="space-y-4">
                    {list.map((trip) => (
                      <TripCard key={trip.id} trip={trip} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>

      <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-end px-5">
        <Button
          asChild
          size="lg"
          className="pointer-events-auto h-14 gap-2 rounded-full pr-6 pl-5 shadow-lg"
        >
          <Link href="/trips/new">
            <Plus className="size-5" aria-hidden />
            新增旅遊
          </Link>
        </Button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <Luggage className="text-muted-foreground size-7" aria-hidden />
      </div>
      <h2 className="mt-5 text-lg font-semibold">還沒有任何旅遊</h2>
      <Button asChild className="mt-6">
        <Link href="/trips/new">建立第一趟旅遊</Link>
      </Button>
    </div>
  )
}
