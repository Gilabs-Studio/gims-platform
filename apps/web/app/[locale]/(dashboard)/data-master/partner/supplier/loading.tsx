import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

export default function SupplierLoading() {
  return (
    <PageMotion className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32 ml-auto" />
      </div>
      <div className="border rounded-lg">
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </PageMotion>
  );
}
