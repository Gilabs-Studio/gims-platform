import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManufacturingQualityAndonLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-56 rounded-md" />
        <Skeleton className="h-9 w-44 rounded-md" />
        <Skeleton className="h-9 w-52 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-md border bg-card p-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

