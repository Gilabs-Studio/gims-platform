"use client";

import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";
import { Skeleton } from "@/components/ui/skeleton";

// Leaflet requires browser APIs — disable SSR for the map component
const GeoPerformanceMap = dynamic(
  () =>
    import("./geo-performance-map").then((mod) => ({
      default: mod.GeoPerformanceMap,
    })),
  {
    ssr: false,
    loading: () => <GeoPerformanceMapSkeleton />,
  }
);

function GeoPerformanceMapSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="h-[500px]" />
        <Skeleton className="h-[500px]" />
      </div>
    </div>
  );
}

export function GeoPerformancePage() {
  return (
    <PageMotion className="space-y-0">
      <GeoPerformanceMap />
    </PageMotion>
  );
}
