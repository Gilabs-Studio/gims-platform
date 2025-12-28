"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";

export default function PurchaseRequisitionsLoading() {
  return (
    <PageMotion className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="h-[calc(100vh-12rem)] min-h-[400px] border rounded-lg">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </PageMotion>
  );
}

