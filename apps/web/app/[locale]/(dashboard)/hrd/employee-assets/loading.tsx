import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeAssetsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full sm:w-[200px]" />
        <Skeleton className="h-10 w-full sm:w-[200px]" />
      </div>

      {/* Table Skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
