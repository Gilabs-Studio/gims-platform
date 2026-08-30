import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManufacturingCsvAuditTrailLoading() {
  return (
    <div className="space-y-6 p-2">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Auditor Banner Skeleton */}
      <Skeleton className="h-20 rounded-lg w-full" />

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>

      {/* Filter Toolbar Skeleton */}
      <Skeleton className="h-14 rounded-lg w-full" />

      {/* Table Skeleton */}
      <Skeleton className="h-96 rounded-lg w-full" />
    </div>
  );
}
