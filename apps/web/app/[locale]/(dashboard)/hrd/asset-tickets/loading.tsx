import { PageMotion } from "@/components/motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function HRAssetTicketsLoading() {
  return (
    <PageMotion className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-96 w-full rounded-xl" />
    </PageMotion>
  );
}
