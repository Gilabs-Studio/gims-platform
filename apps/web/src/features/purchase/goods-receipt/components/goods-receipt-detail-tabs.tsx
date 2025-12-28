"use client";

import { Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <>
      {/* Overview Tab - Load immediately (default tab) */}
      <Suspense fallback={<TabSkeleton />}>
        <OverviewTab goodsReceipt={goodsReceipt} />
      </Suspense>

      {/* Items Tab - Lazy loaded */}
      <Suspense fallback={<TabSkeleton />}>
        <ItemsTab goodsReceipt={goodsReceipt} items={items} />
      </Suspense>

      {/* Metadata Tab - Lazy loaded */}
      <Suspense fallback={<TabSkeleton />}>
        <MetadataTab goodsReceipt={goodsReceipt} />
      </Suspense>
    </>
  );
}

