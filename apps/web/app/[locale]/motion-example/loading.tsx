import { Skeleton } from "@/components/ui/skeleton";

export default function MerchandiseLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-border bg-card/30 rounded-lg p-4"
          >
            <Skeleton className="aspect-square w-full mb-4" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-4" />
            <Skeleton className="h-2 w-full mb-1" />
            <Skeleton className="h-2 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
