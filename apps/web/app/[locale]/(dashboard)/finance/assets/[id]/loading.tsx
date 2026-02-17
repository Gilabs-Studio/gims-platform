import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="rounded-md border p-4 space-y-3">
          <Skeleton className="h-5 w-52" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          <Skeleton className="h-5 w-52" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
