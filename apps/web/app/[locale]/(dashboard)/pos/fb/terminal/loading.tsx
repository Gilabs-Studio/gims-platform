import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

export default function POSTerminalLoading() {
  return (
    <PageMotion className="flex h-[calc(100vh-64px)] gap-0">
      <div className="flex-[2] p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex-[1] border-l p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </PageMotion>
  );
}
