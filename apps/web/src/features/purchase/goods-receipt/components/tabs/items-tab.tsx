"use client";

import { useRef, memo, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import type { GoodsReceipt, GoodsReceiptItem } from "../../types";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface ItemsTabProps {
  readonly goodsReceipt: GoodsReceipt;
  readonly items: GoodsReceiptItem[];
}

// Memoized item card component to prevent unnecessary re-renders
const ItemCard = memo(({ item, tDetail }: { item: GoodsReceiptItem; tDetail: ReturnType<typeof useTranslations> }) => {
  return (
    <div className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-base">
            {item.product?.name ?? `Product #${item.product_id}`}
          </p>
          {item.product?.code && (
            <p className="text-sm text-muted-foreground mt-1">
              Code: {item.product.code}
            </p>
          )}
        </div>
        <p className="font-semibold text-base ml-4">
          Qty: {item.quantity}
        </p>
      </div>
      <Separator />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">{tDetail("items.quantity")}</p>
          <p className="font-medium">{item.quantity}</p>
        </div>
        {item.lot_number && (
          <div>
            <p className="text-muted-foreground mb-1">{tDetail("items.lotNumber")}</p>
            <p className="font-medium">{item.lot_number}</p>
          </div>
        )}
        {item.expired_date && (
          <div>
            <p className="text-muted-foreground mb-1">{tDetail("items.expiredDate")}</p>
            <p className="font-medium">
              {new Date(item.expired_date).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        )}
        {item.inventory_batch_id && (
          <div>
            <p className="text-muted-foreground mb-1">{tDetail("items.batchId")}</p>
            <p className="font-medium">#{item.inventory_batch_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => 
  prev.item.id === next.item.id &&
  prev.item.quantity === next.item.quantity &&
  prev.item.lot_number === next.item.lot_number &&
  prev.item.expired_date === next.item.expired_date &&
  prev.item.inventory_batch_id === next.item.inventory_batch_id &&
  prev.item.product?.name === next.item.product?.name &&
  prev.item.product?.code === next.item.product?.code
);
ItemCard.displayName = "ItemCard";

export function ItemsTab({ goodsReceipt, items }: ItemsTabProps) {
  const tDetail = useTranslations("goodsReceipts.detail");
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling for large item lists
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Estimated height per item card
    overscan: 5, // Render 5 extra items outside viewport
  });

  const itemsCountText = useMemo(() => 
    items.length === 0
      ? tDetail("items.empty")
      : `${items.length} item${items.length > 1 ? "s" : ""} in this goods receipt`,
    [items.length, tDetail]
  );

  return (
    <TabsContent value="items" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {tDetail("items.title")}
          </CardTitle>
          <CardDescription>
            {itemsCountText}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {tDetail("items.empty")}
            </p>
          ) : (
            <div 
              ref={parentRef} 
              className="h-[600px] overflow-auto"
              style={{ contain: "strict" }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const item = items[virtualItem.index];
                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <ItemCard item={item} tDetail={tDetail} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

