import { Skeleton } from "@/components/ui/skeleton";

export default function RoomBookingLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* 5 Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Middle Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Skeleton className="h-[380px] lg:col-span-8 rounded-lg" />
          <Skeleton className="h-[380px] lg:col-span-4 rounded-lg" />
        </div>
      </div>

      {/* Bottom Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Skeleton className="h-72 lg:col-span-7 rounded-lg" />
        <Skeleton className="h-72 lg:col-span-5 rounded-lg" />
      </div>
    </div>
  );
}
