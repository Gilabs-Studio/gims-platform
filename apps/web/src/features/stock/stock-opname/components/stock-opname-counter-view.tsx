"use client";

import { forwardRef, useEffect, useState, useCallback, useImperativeHandle, useRef } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useStockOpnameItemsInfinite, useSaveStockOpnameLines } from "../hooks/use-stock-opnames";
import type { StockOpname, StockOpnameItem } from "../types";
import type { StockOpnameDraftActions } from "./stock-opname-manager-view";

interface Props {
  opname: StockOpname;
  readOnly?: boolean;
}

interface CounterItemState {
  physical_qty: number | null;
  dirty: boolean;
  saving: boolean;
}

interface PendingCounterLine {
  itemId: string;
  product_id: string;
  system_qty: number;
  physical_qty: number | null;
  notes: string;
  inventory_batch_id?: string | null;
  batch_number?: string;
  batch_qty?: number;
}

export const StockOpnameCounterView = forwardRef<StockOpnameDraftActions, Props>(function StockOpnameCounterView({ opname, readOnly }: Props, ref) {
  const t = useTranslations("stock_opname");
  const tCommon = useTranslations("common");

  const {
    data: itemsData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useStockOpnameItemsInfinite(opname.id, 20);
  const items = itemsData?.pages.flatMap((page) => page.data) ?? [];

  const saveLinesMutation = useSaveStockOpnameLines();

  // Per-item local state for physical qty tracking
  const [itemState, setItemState] = useState<Record<string, CounterItemState>>(() => {
    if (typeof window === "undefined") return {};

    const stored = window.localStorage.getItem(`stock-opname:counter:${opname.id}`);
    if (!stored) return {};

    try {
      return JSON.parse(stored) as Record<string, CounterItemState>;
    } catch {
      return {};
    }
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const pendingLinesRef = useRef<Record<string, PendingCounterLine>>({});
  const flushTimerRef = useRef<number | null>(null);
  const isFlushingRef = useRef(false);
  const flushPromiseRef = useRef<Promise<boolean> | null>(null);
  const flushAgainRef = useRef(false);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [isQueueSaving, setIsQueueSaving] = useState(false);
  const draftStorageKey = `stock-opname:counter:${opname.id}`;

  const getPhysicalQty = (item: StockOpnameItem): number | null => {
    const local = itemState[item.id];
    if (local !== undefined) return local.physical_qty;
    return item.physical_qty;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const snapshot = Object.entries(itemState).reduce<Record<string, CounterItemState>>((acc, [itemId, state]) => {
      if (state.physical_qty === null && !state.dirty && !state.saving) {
        return acc;
      }
      acc[itemId] = state;
      return acc;
    }, {});

    if (Object.keys(snapshot).length === 0) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
  }, [draftStorageKey, itemState]);

  const flushPendingLines = useCallback(async (): Promise<boolean> => {
    if (readOnly) {
      return true;
    }

    if (flushPromiseRef.current) {
      return flushPromiseRef.current;
    }

    const runFlush = async (): Promise<boolean> => {
      if (isFlushingRef.current) {
        flushAgainRef.current = true;
        return true;
      }

      const snapshot = Object.values(pendingLinesRef.current);
      if (snapshot.length === 0) {
        return true;
      }

      isFlushingRef.current = true;
      setIsQueueSaving(true);
      pendingLinesRef.current = {};
      setHasPendingDraft(false);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      const itemIds = snapshot.map((line) => line.itemId);
      setItemState((prev) => {
        const next = { ...prev };
        for (const itemId of itemIds) {
          next[itemId] = {
            ...(next[itemId] ?? {
              physical_qty: null,
              dirty: false,
              saving: false,
            }),
            saving: true,
            dirty: false,
          };
        }
        return next;
      });

      let didFail = false;
      try {
        await saveLinesMutation.mutateAsync({
          id: opname.id,
          data: {
            items: snapshot.map((line) => ({
              product_id: line.product_id,
              system_qty: line.system_qty,
              physical_qty: line.physical_qty,
              notes: line.notes,
              inventory_batch_id: line.inventory_batch_id,
              batch_number: line.batch_number,
              batch_qty: line.batch_qty,
            })),
          },
        });

        setItemState((prev) => {
          const next = { ...prev };
          for (const itemId of itemIds) {
            if (!next[itemId]) continue;
            next[itemId] = { ...next[itemId], saving: false, dirty: false };
          }
          return next;
        });
        return true;
      } catch {
        didFail = true;
        pendingLinesRef.current = snapshot.reduce<Record<string, PendingCounterLine>>((acc, line) => {
          acc[line.itemId] = line;
          return acc;
        }, {});
        setHasPendingDraft(true);
        setItemState((prev) => {
          const next = { ...prev };
          for (const itemId of itemIds) {
            if (!next[itemId]) continue;
            next[itemId] = { ...next[itemId], saving: false, dirty: true };
          }
          return next;
        });
        toast.error(tCommon("error"));
        return false;
      } finally {
        isFlushingRef.current = false;
        setIsQueueSaving(false);
        if (!didFail && (flushAgainRef.current || Object.keys(pendingLinesRef.current).length > 0)) {
          flushAgainRef.current = false;
          setHasPendingDraft(Object.keys(pendingLinesRef.current).length > 0);
        }
      }
    };

    const promise = runFlush().finally(() => {
      flushPromiseRef.current = null;
    });
    flushPromiseRef.current = promise;
    return promise;
  }, [opname.id, readOnly, saveLinesMutation, tCommon]);

  useImperativeHandle(ref, () => ({
    flushPendingDrafts: flushPendingLines,
  }), [flushPendingLines]);

  const queueQtyChange = useCallback((item: StockOpnameItem, newQty: number | null) => {
    if (readOnly) return;

    const existing = itemState[item.id];
    const baseQty = existing?.physical_qty ?? item.physical_qty;
    if (baseQty === newQty) {
      return;
    }

    pendingLinesRef.current[item.id] = {
      itemId: item.id,
      product_id: item.product_id,
      system_qty: item.system_qty,
      physical_qty: newQty,
      notes: item.notes ?? "",
      inventory_batch_id: item.inventory_batch_id,
      batch_number: item.batch_number,
      batch_qty: item.batch_qty,
    };
    setHasPendingDraft(true);

    setItemState((prev) => ({
      ...prev,
      [item.id]: {
        physical_qty: newQty,
        dirty: true,
        saving: false,
      },
    }));

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }

    flushTimerRef.current = window.setTimeout(() => {
      void flushPendingLines();
    }, 30000);
  }, [flushPendingLines, itemState, readOnly]);

  const handleManualSaveDraft = useCallback(() => {
    void flushPendingLines();
  }, [flushPendingLines]);

  useEffect(() => {
    if (!hasNextPage) return;

    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, items.length]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
        <p>{tCommon("noData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={handleManualSaveDraft}
            disabled={isQueueSaving || !hasPendingDraft}
          >
            Save Draft
          </Button>
        </div>
      )}

      {readOnly && (
        <div className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
          {t("counterView.readOnlyNotice")}
        </div>
      )}

      {items.map((item) => {
        const localState = itemState[item.id];
        const physicalQty = getPhysicalQty(item);
        const variance =
          physicalQty !== null ? physicalQty - item.system_qty : null;
        const isShrinkage = variance !== null && variance < 0;
        const isOverstock = variance !== null && variance > 0;
        const isExact = variance !== null && variance === 0;
        const isUncounted = physicalQty === null;
        const isSaving = localState?.saving ?? false;

        return (
          <div
            key={item.id}
            className={[
              "rounded-lg border p-4 transition-colors",
              isUncounted ? "border-muted" : isShrinkage ? "border-destructive/30 bg-destructive/5" : isOverstock ? "border-green-500/30 bg-green-50/50" : isExact ? "border-green-300/50 bg-green-50/30" : "",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Product info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium leading-snug">{item.product_name}</p>
                  {item.product_code && (
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.product_code}
                    </span>
                  )}
                </div>
                {item.batch_number && (
                  <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1 py-0.5 rounded">
                    Batch: {item.batch_number}
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {t("counterView.systemQty")}: <span className="font-semibold text-foreground">{item.system_qty}</span>
                </p>
                {variance !== null && !isUncounted && (
                  <div className="flex items-center gap-1">
                    {isShrinkage && (
                      <Badge variant="destructive" className="text-xs">
                        {variance}
                      </Badge>
                    )}
                    {isOverstock && (
                      <Badge variant="success" className="text-xs">
                        +{variance}
                      </Badge>
                    )}
                    {isExact && (
                      <Badge variant="success" className="text-xs">
                        {t("counterView.exact")}
                      </Badge>
                    )}
                  </div>
                )}
                {isUncounted && (
                  <Badge variant="outline" className="text-xs">
                    {t("counterView.notCounted")}
                  </Badge>
                )}
              </div>

              {/* Qty input controls */}
              {!readOnly && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 cursor-pointer"
                    onClick={() => queueQtyChange(item, Math.max(0, (physicalQty ?? 0) - 1))}
                    disabled={isSaving}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={physicalQty ?? ""}
                    placeholder="-"
                    className="w-20 text-center text-lg font-bold"
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : parseFloat(e.target.value);
                      queueQtyChange(item, val);
                    }}
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 cursor-pointer"
                    onClick={() => queueQtyChange(item, (physicalQty ?? 0) + 1)}
                    disabled={isSaving}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                </div>
              )}

              {/* Read-only qty display */}
              {readOnly && (
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold">
                    {physicalQty ?? <span className="text-muted-foreground text-base">-</span>}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div ref={loadMoreRef} className="h-8 w-full" aria-hidden="true" />
      {hasNextPage && isFetchingNextPage && (
        <div className="pt-2 flex justify-center text-sm text-muted-foreground">
          {tCommon("loading")}
        </div>
      )}
    </div>
  );
});
