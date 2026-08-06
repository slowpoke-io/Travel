'use client'

import { useRouter } from 'next/navigation'

import { TripForm } from '@/components/trip/trip-form'
import type { ActionResult } from '@/lib/action-result'
import type { TripInput } from '@/lib/schemas'
import type { TripRow } from '@/lib/supabase/database.types'

export function TripSettingsForm({
  trip,
  dayCount,
  action,
}: {
  trip: TripRow
  dayCount: number
  action: (input: TripInput) => Promise<ActionResult>
}) {
  const router = useRouter()

  return (
    <TripForm
      mode="edit"
      dayCountHint={dayCount}
      initial={{
        title: trip.title,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        summary: trip.summary,
        timezone: trip.timezone,
      }}
      action={action}
      onSaved={() => router.refresh()}
    />
  )
}
