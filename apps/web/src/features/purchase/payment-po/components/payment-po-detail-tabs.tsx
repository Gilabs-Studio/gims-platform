"use client";

import { Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { FileText, DollarSign, Calendar } from "lucide-react";
import type { PaymentPO } from "../types";
import { useTranslations } from "next-intl";

// Lazy load tab components for code splitting
const OverviewTab = lazy(() =>
  import("./tabs/overview-tab").then((mod) => ({ default: mod.OverviewTab }))
);

const AllocationsTab = lazy(() =>
  import("./tabs/allocations-tab").then((mod) => ({ default: mod.AllocationsTab }))
);

const MetadataTab = lazy(() =>
  import("./tabs/metadata-tab").then((mod) => ({ default: mod.MetadataTab }))
);

interface PaymentPODetailTabsProps {
  readonly paymentPO: PaymentPO;
}

// Tab loading skeleton
function TabSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PaymentPODetailTabs({
  paymentPO,
}: PaymentPODetailTabsProps) {
  const tDetail = useTranslations("paymentPO.detail");
  const allocations = paymentPO?.allocations ?? [];

  // Radix UI Tabs automatically handles conditional rendering
  // Only the active TabsContent will be rendered
  return (
    <>
      {/* Overview Tab - Load immediately (default tab) */}
      <TabsContent value="overview">
        <Suspense fallback={<TabSkeleton />}>
          <OverviewTab paymentPO={paymentPO} />
        </Suspense>
      </TabsContent>

      {/* Allocations Tab - Lazy loaded, only render when active */}
      <TabsContent value="allocations">
        <Suspense fallback={<TabSkeleton />}>
          <AllocationsTab paymentPO={paymentPO} allocations={allocations} />
        </Suspense>
      </TabsContent>

      {/* Metadata Tab - Lazy loaded, only render when active */}
      <TabsContent value="metadata">
        <Suspense fallback={<TabSkeleton />}>
          <MetadataTab paymentPO={paymentPO} />
        </Suspense>
      </TabsContent>
    </>
  );
}

