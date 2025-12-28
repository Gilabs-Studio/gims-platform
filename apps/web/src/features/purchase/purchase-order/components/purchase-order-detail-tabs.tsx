"use client";

import { Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { FileText, ShoppingCart, DollarSign, Calendar } from "lucide-react";
import type { PurchaseOrder } from "../types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

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

interface PurchaseOrderDetailTabsProps {
  readonly order: PurchaseOrder;
}

// Tab loading skeleton
function TabSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PurchaseOrderDetailTabs({
  order,
}: PurchaseOrderDetailTabsProps) {
  const tDetail = useTranslations("purchaseOrders.detail");
  const items = order?.items ?? order?.purchase_order_items ?? [];

  // Radix UI Tabs automatically handles conditional rendering
  // Only the active TabsContent will be rendered
  return (
    <>
      {/* Overview Tab - Load immediately (default tab) */}
      <TabsContent value="overview">
        <Suspense fallback={<TabSkeleton />}>
          <OverviewTab order={order} />
        </Suspense>
      </TabsContent>

      {/* Items Tab - Lazy loaded, only render when active */}
      <TabsContent value="items">
        <Suspense fallback={<TabSkeleton />}>
          <ItemsTab order={order} items={items} />
        </Suspense>
      </TabsContent>

      {/* Financial Tab - Lazy loaded, only render when active */}
      <TabsContent value="financial">
        <Suspense fallback={<TabSkeleton />}>
          <FinancialTab order={order} />
        </Suspense>
      </TabsContent>

      {/* Metadata Tab - Lazy loaded, only render when active */}
      <TabsContent value="metadata">
        <Suspense fallback={<TabSkeleton />}>
          <MetadataTab order={order} />
        </Suspense>
      </TabsContent>
    </>
  );
}

