import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

export default function PayableRecapLoading() {
  return (
    <PageMotion className="space-y-6 flex flex-col p-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 h-24 flex flex-col justify-between">
            <div className="flex justify-between w-full">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-32 mt-2" />
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex justify-between items-center w-full">
        <Skeleton className="h-10 w-full sm:max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-md border p-0">
        <div className="border-b px-4 py-3 flex gap-4">
           {Array.from({ length: 6 }).map((_, i) => (
             <Skeleton key={i} className="h-5 flex-1" />
           ))}
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-8 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageMotion>
  );
}
