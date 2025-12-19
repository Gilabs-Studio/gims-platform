import { Skeleton } from "@/components/ui/skeleton";

export default function PurchaseOrderLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}

