import { Skeleton } from "@/components/ui/skeleton";

export default function TicketingLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>

      {/* 5 Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Tabs & Filters Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>

        {/* Data Table Skeleton */}
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    </div>
  );
}
