"use client";

import { Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { FileText, ShoppingCart, Calendar } from "lucide-react";
import type { GoodsReceipt } from "../types";
import { useTranslations } from "next-intl";

// Lazy load tab components for code splitting
const OverviewTab = lazy(() =>
  import("./tabs/overview-tab").then((mod) => ({ default: mod.OverviewTab }))
);

const ItemsTab = lazy(() =>
  import("./tabs/items-tab").then((mod) => ({ default: mod.ItemsTab }))
);

const MetadataTab = lazy(() =>
  import("./tabs/metadata-tab").then((mod) => ({ default: mod.MetadataTab }))
);

interface GoodsReceiptDetailTabsProps {
  readonly goodsReceipt: GoodsReceipt;
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

export function GoodsReceiptDetailTabs({
  goodsReceipt,
}: GoodsReceiptDetailTabsProps) {
  const tDetail = useTranslations("goodsReceipts.detail");
  const items = goodsReceipt?.items ?? [];

  // Radix UI Tabs automatically handles conditional rendering
  // Only the active TabsContent will be rendered
  return (
    <>
      {/* Overview Tab - Load immediately (default tab) */}
      <TabsContent value="overview">
        <Suspense fallback={<TabSkeleton />}>
          <OverviewTab goodsReceipt={goodsReceipt} />
        </Suspense>
      </TabsContent>

      {/* Items Tab - Lazy loaded, only render when active */}
      <TabsContent value="items">
        <Suspense fallback={<TabSkeleton />}>
          <ItemsTab goodsReceipt={goodsReceipt} items={items} />
        </Suspense>
      </TabsContent>

      {/* Metadata Tab - Lazy loaded, only render when active */}
      <TabsContent value="metadata">
        <Suspense fallback={<TabSkeleton />}>
          <MetadataTab goodsReceipt={goodsReceipt} />
        </Suspense>
      </TabsContent>
    </>
  );
}

