import { ActivityListSkeleton } from '@/components/trip/skeletons'

export default function Loading() {
  return (
    <div className="animate-in fade-in pt-4 duration-200">
      <ActivityListSkeleton />
    </div>
  )
}
