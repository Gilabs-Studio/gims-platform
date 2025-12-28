"use client";

import { Suspense, lazy } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import type { SupplierInvoice } from "../types";

// Lazy load tab components for code splitting
const OverviewTab = lazy(() =>
  import("./tabs/overview-tab").then((mod) => ({ default: mod.OverviewTab }))
);

const ItemsTab = lazy(() =>
  import("./tabs/items-tab").then((mod) => ({ default: mod.ItemsTab }))
);

const FinancialTab = lazy(() =>
  import("./tabs/financial-tab").then((mod) => ({ default: mod.FinancialTab }))
);

const MetadataTab = lazy(() =>
  import("./tabs/metadata-tab").then((mod) => ({ default: mod.MetadataTab }))
);

interface SupplierInvoiceDetailTabsProps {
  readonly invoice: SupplierInvoice;
}

// Tab loading skeleton
function TabSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SupplierInvoiceDetailTabs({
  invoice,
}: SupplierInvoiceDetailTabsProps) {
  const items = invoice?.items ?? [];

  // Radix UI Tabs automatically handles conditional rendering
  // Only the active TabsContent will be rendered
  return (
    <>
      {/* Overview Tab - Load immediately (default tab) */}
      <TabsContent value="overview">
        <Suspense fallback={<TabSkeleton />}>
          <OverviewTab invoice={invoice} />
        </Suspense>
      </TabsContent>

      {/* Items Tab - Lazy loaded, only render when active */}
      <TabsContent value="items">
        <Suspense fallback={<TabSkeleton />}>
          <ItemsTab invoice={invoice} items={items} />
        </Suspense>
      </TabsContent>

      {/* Financial Tab - Lazy loaded, only render when active */}
      <TabsContent value="financial">
        <Suspense fallback={<TabSkeleton />}>
          <FinancialTab invoice={invoice} />
        </Suspense>
      </TabsContent>

      {/* Metadata Tab - Lazy loaded, only render when active */}
      <TabsContent value="metadata">
        <Suspense fallback={<TabSkeleton />}>
          <MetadataTab invoice={invoice} />
        </Suspense>
      </TabsContent>
    </>
  );
}




