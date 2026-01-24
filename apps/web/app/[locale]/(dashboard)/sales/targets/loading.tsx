"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function TargetsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-48" />
        <div className="flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="rounded-md border p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
               <Skeleton className="h-12 flex-1" />
               <Skeleton className="h-12 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
