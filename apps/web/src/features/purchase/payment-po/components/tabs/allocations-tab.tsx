"use client";

import { useRef, memo, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { PaymentPO, PaymentAllocation } from "../../types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface AllocationsTabProps {
  readonly paymentPO: PaymentPO;
  readonly allocations: PaymentAllocation[];
}

// Memoized allocation card component
const AllocationCard = memo(({ allocation }: { allocation: PaymentAllocation }) => {
  return (
    <div className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-base">
            {allocation.chart_of_account?.code ?? "N/A"} -{" "}
            {allocation.chart_of_account?.name ?? "Unknown Account"}
          </p>
          {allocation.chart_of_account?.type && (
            <p className="text-sm text-muted-foreground mt-1">
              Type: {allocation.chart_of_account.type}
            </p>
          )}
        </div>
        <p className="font-semibold text-base ml-4">
          {formatCurrency(allocation.amount ?? 0)}
        </p>
      </div>
    </div>
  );
}, (prev, next) => 
  prev.allocation.id === next.allocation.id &&
  prev.allocation.amount === next.allocation.amount &&
  prev.allocation.chart_of_account?.code === next.allocation.chart_of_account?.code &&
  prev.allocation.chart_of_account?.name === next.allocation.chart_of_account?.name &&
  prev.allocation.chart_of_account?.type === next.allocation.chart_of_account?.type
);
AllocationCard.displayName = "AllocationCard";

export function AllocationsTab({ paymentPO, allocations }: AllocationsTabProps) {
  const tDetail = useTranslations("paymentPO.detail");
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling for large allocation lists
  const virtualizer = useVirtualizer({
    count: allocations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height per allocation card
    overscan: 5,
  });

  const allocationsCountText = useMemo(() => 
    allocations.length === 0
      ? "No allocations found"
      : `${allocations.length} allocation${allocations.length > 1 ? "s" : ""} in this payment`,
    [allocations.length]
  );

  const totalAllocated = useMemo(() => 
    allocations.reduce((sum, alloc) => sum + (alloc.amount ?? 0), 0),
    [allocations]
  );

  return (
    <TabsContent value="allocations" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {tDetail("allocations")}
          </CardTitle>
          <CardDescription>
            {allocationsCountText}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No allocations found
            </p>
          ) : (
            <>
              <div 
                ref={parentRef} 
                className="h-[500px] overflow-auto mb-4"
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
                    const allocation = allocations[virtualItem.index];
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
                        <AllocationCard allocation={allocation} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-medium">Total Allocated</p>
                <p className="text-lg font-bold">
                  {formatCurrency(totalAllocated)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

