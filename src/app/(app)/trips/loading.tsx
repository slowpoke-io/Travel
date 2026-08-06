import { TripListSkeleton } from '@/components/trip/skeletons'

export default function Loading() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md">
      <div className="pt-safe px-5 py-4">
        <div className="bg-muted h-8 w-32 animate-pulse rounded-md" />
      </div>
      <TripListSkeleton />
    </div>
  )
}
