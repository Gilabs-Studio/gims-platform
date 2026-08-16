import { Skeleton } from "@/components/ui/skeleton";

export default function PayrollLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-72 lg:col-span-6 xl:col-span-5 rounded-lg" />
        <Skeleton className="h-72 lg:col-span-6 xl:col-span-4 rounded-lg" />
        <Skeleton className="h-72 lg:col-span-12 xl:col-span-3 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-64 lg:col-span-7 xl:col-span-8 rounded-lg" />
        <Skeleton className="h-64 lg:col-span-5 xl:col-span-4 rounded-lg" />
      </div>
    </div>
  );
}
