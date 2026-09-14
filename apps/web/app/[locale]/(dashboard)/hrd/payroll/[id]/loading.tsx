import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

export default function PayrollDetailLoading() {
  return (
    <PageMotion className="space-y-6">
      <Skeleton className="h-12 w-64 rounded-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[500px] lg:col-span-2 rounded-lg" />
        <Skeleton className="h-[500px] rounded-lg" />
      </div>
    </PageMotion>
  );
}
