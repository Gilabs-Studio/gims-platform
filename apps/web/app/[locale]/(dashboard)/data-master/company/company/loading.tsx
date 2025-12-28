"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

export default function CompanyLoading() {
  return (
    <PageMotion className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </PageMotion>
  );
}

