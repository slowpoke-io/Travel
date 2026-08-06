import { updateTrip } from '@/actions/owner/trips'
import { DayManager } from '@/components/trip/day-manager'
import { DeleteTripButton } from '@/components/trip/delete-trip-button'
import { ShareSettings } from '@/components/trip/share-settings'
import { TagManager } from '@/components/trip/tag-manager'
import { TripSettingsForm } from '@/components/trip/trip-settings-form'
import { TripShell } from '@/components/trip/trip-shell'
import { Separator } from '@/components/ui/separator'
import { isMapsEnabled } from '@/lib/env'
import { getOwnerTripContext } from '@/lib/trip-context'
import { buildTripViewModel } from '@/lib/trip-view-model'

export const metadata = { title: '旅遊設定' }

export default async function TripSettingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const { bundle, access } = await getOwnerTripContext(tripId)
  const { trip, days, tags } = bundle
  const vm = buildTripViewModel(bundle)

  // Server Action 需要 bind 過的版本才能傳給 client component
  async function save(input: Parameters<typeof updateTrip>[1]) {
    'use server'
    return updateTrip(tripId, input)
  }

  return (
    <TripShell
      access={access}
      title={trip.title}
      currentDayIndex={1}
      mapsEnabled={isMapsEnabled()}
    >
      <main className="space-y-8 px-5 py-6 pb-28">
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            基本資訊
          </h2>
          <TripSettingsForm
            trip={trip}
            dayCount={days.length}
            action={save}
          />
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            天數（{days.length} 天）
          </h2>
          <DayManager tripId={tripId} days={days} counts={vm.counts} />
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            標籤
          </h2>
          <TagManager tripId={tripId} tags={tags} />
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            分享
          </h2>
          <ShareSettings
            tripId={tripId}
            initialToken={trip.share_token}
            initialEnabled={trip.share_enabled}
            initialCanEdit={trip.share_can_edit}
          />
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-destructive text-xs font-semibold tracking-wide uppercase">
            危險區域
          </h2>
          <DeleteTripButton tripId={tripId} title={trip.title} />
        </section>
      </main>
    </TripShell>
  )
}
