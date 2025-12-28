import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentPOLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
