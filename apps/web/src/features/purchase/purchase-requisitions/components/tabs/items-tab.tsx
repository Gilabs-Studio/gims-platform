"use client";

import { useRef, memo, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import type { PurchaseRequisition, PurchaseRequisitionItem } from "../../types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface ItemsTabProps {
  readonly requisition: PurchaseRequisition;
  readonly items: PurchaseRequisitionItem[];
}

// Memoized item card component
const RequisitionItemCard = memo(({ item, tDetail }: { item: PurchaseRequisitionItem; tDetail: ReturnType<typeof useTranslations> }) => {
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
          {formatCurrency(item.subtotal ?? 0)}
        </p>
      </div>
      <Separator />
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">{tDetail("items.quantity")}</p>
          <p className="font-medium">{item.quantity}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">
            {tDetail("items.purchasePrice")}
          </p>
          <p className="font-medium">{formatCurrency(item.purchase_price ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">{tDetail("items.discount")}</p>
          <p className="font-medium">{item.discount ?? 0}%</p>
        </div>
      </div>
      {item.notes && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{item.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}, (prev, next) => 
  prev.item.id === next.item.id &&
  prev.item.quantity === next.item.quantity &&
  prev.item.subtotal === next.item.subtotal &&
  prev.item.purchase_price === next.item.purchase_price &&
  prev.item.discount === next.item.discount &&
  prev.item.notes === next.item.notes &&
  prev.item.product?.name === next.item.product?.name &&
  prev.item.product?.code === next.item.product?.code
);
RequisitionItemCard.displayName = "RequisitionItemCard";

export function ItemsTab({ requisition, items }: ItemsTabProps) {
  const tDetail = useTranslations("purchaseRequisitions.detail");
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling for large item lists
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160, // Estimated height per item card
    overscan: 5,
  });

  const itemsCountText = useMemo(() => 
    items.length === 0
      ? tDetail("items.empty")
      : `${items.length} item${items.length > 1 ? "s" : ""} in this requisition`,
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
                      <RequisitionItemCard item={item} tDetail={tDetail} />
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


