import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-56 w-full rounded-3xl" />
      <div className="space-y-3 rounded-2xl border bg-background/80 p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
