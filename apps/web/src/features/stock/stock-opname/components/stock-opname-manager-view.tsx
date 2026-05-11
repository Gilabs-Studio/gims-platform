"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSaveStockOpnameLines, useStockOpnameItemsInfinite } from "../hooks/use-stock-opnames";
import type { StockOpname } from "../types";

interface Props {
  opname: StockOpname;
  canEditDraft?: boolean;
}

interface ManagerDraftState {
  physical_qty: number | null;
  notes: string;
  dirty: boolean;
  saving: boolean;
}

interface DraftLinePayload {
  itemId: string;
  product_id: string;
  system_qty: number;
  physical_qty: number | null;
  notes: string;
}

export interface StockOpnameDraftActions {
  flushPendingDrafts: () => Promise<boolean>;
}

export const StockOpnameManagerView = forwardRef<StockOpnameDraftActions, Props>(function StockOpnameManagerView({ opname, canEditDraft = false }: Props, ref) {
  const t = useTranslations("stock_opname");
  const tCommon = useTranslations("common");
  const isDraftEditable = opname.status === "draft" && canEditDraft;

  const {
    data: itemsData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useStockOpnameItemsInfinite(opname.id, 20);
  const items = itemsData?.pages.flatMap((page) => page.data) ?? [];
  const saveLinesMutation = useSaveStockOpnameLines();

  const [activeTab, setActiveTab] = useState("items");
  const [draftState, setDraftState] = useState<Record<string, ManagerDraftState>>(() => {
    if (typeof window === "undefined") return {};

    const stored = window.localStorage.getItem(`stock-opname:manager:${opname.id}`);
    if (!stored) return {};

    try {
      return JSON.parse(stored) as Record<string, ManagerDraftState>;
    } catch {
      return {};
    }
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const draftQueueRef = useRef<Record<string, DraftLinePayload>>({});
  const flushTimerRef = useRef<number | null>(null);
  const isFlushingRef = useRef(false);
  const flushPromiseRef = useRef<Promise<boolean> | null>(null);
  const needsRefetchRef = useRef(false);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [isQueueSaving, setIsQueueSaving] = useState(false);
  const draftStorageKey = `stock-opname:manager:${opname.id}`;

  const getPhysicalQty = useCallback((itemId: string, fallback: number | null) => {
    const local = draftState[itemId];
    return local ? local.physical_qty : fallback;
  }, [draftState]);

  const getNotes = useCallback((itemId: string, fallback: string) => {
    const local = draftState[itemId];
    return local ? local.notes : fallback;
  }, [draftState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const snapshot = Object.entries(draftState).reduce<Record<string, ManagerDraftState>>((acc, [itemId, state]) => {
      if (state.physical_qty === null && !state.notes && !state.dirty && !state.saving) {
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
  }, [draftStorageKey, draftState]);

  const applyDraftState = useCallback((itemId: string, nextState: Partial<ManagerDraftState>, fallbackPhysicalQty: number | null, fallbackNotes: string) => {
    setDraftState((prev) => {
      const current = prev[itemId] ?? {
        physical_qty: fallbackPhysicalQty,
        notes: fallbackNotes,
        dirty: false,
        saving: false,
      };

      return {
        ...prev,
        [itemId]: {
          ...current,
          ...nextState,
        },
      };
    });
  }, []);

  const flushDraftQueue = useCallback(async (): Promise<boolean> => {
    if (!isDraftEditable) {
      return true;
    }

    if (flushPromiseRef.current) {
      return flushPromiseRef.current;
    }

    const runFlush = async (): Promise<boolean> => {
      if (isFlushingRef.current) {
        needsRefetchRef.current = true;
        return true;
      }

      const snapshot = Object.values(draftQueueRef.current);
      if (snapshot.length === 0) {
        return true;
      }

      isFlushingRef.current = true;
      setIsQueueSaving(true);
      draftQueueRef.current = {};
      setHasPendingDraft(false);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      const itemIds = snapshot.map((line) => line.itemId);
      setDraftState((prev) => {
        const next = { ...prev };
        for (const itemId of itemIds) {
          next[itemId] = {
            ...(next[itemId] ?? {
              physical_qty: null,
              notes: "",
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
            })),
          },
        });

        setDraftState((prev) => {
          const next = { ...prev };
          for (const itemId of itemIds) {
            if (!next[itemId]) continue;
            next[itemId] = {
              ...next[itemId],
              saving: false,
              dirty: false,
            };
          }
          return next;
        });
        return true;
      } catch {
        draftQueueRef.current = snapshot.reduce<Record<string, DraftLinePayload>>((acc, line) => {
          acc[line.itemId] = line;
          return acc;
        }, {});
        setHasPendingDraft(true);

        setDraftState((prev) => {
          const next = { ...prev };
          for (const itemId of itemIds) {
            if (!next[itemId]) continue;
            next[itemId] = {
              ...next[itemId],
              saving: false,
              dirty: true,
            };
          }
          return next;
        });
        toast.error(tCommon("error"));
        didFail = true;
        return false;
      } finally {
        isFlushingRef.current = false;
        setIsQueueSaving(false);
        if (!didFail && (needsRefetchRef.current || Object.keys(draftQueueRef.current).length > 0)) {
          needsRefetchRef.current = false;
          setHasPendingDraft(Object.keys(draftQueueRef.current).length > 0);
        }
      }
    };

    const promise = runFlush().finally(() => {
      flushPromiseRef.current = null;
    });
    flushPromiseRef.current = promise;
    return promise;
  }, [isDraftEditable, opname.id, saveLinesMutation, tCommon]);

  useImperativeHandle(ref, () => ({
    flushPendingDrafts: flushDraftQueue,
  }), [flushDraftQueue]);

  const queueDraftLine = useCallback((item: (typeof items)[number], physicalQty: number | null, notes: string) => {
    if (!isDraftEditable) {
      return;
    }

    const current = draftState[item.id];
    const basePhysical = current?.physical_qty ?? item.physical_qty;
    const baseNotes = current?.notes ?? (item.notes ?? "");
    if (basePhysical === physicalQty && baseNotes === notes) {
      return;
    }

    draftQueueRef.current[item.id] = {
      itemId: item.id,
      product_id: item.product_id,
      system_qty: item.system_qty,
      physical_qty: physicalQty,
      notes,
    };
    setHasPendingDraft(true);

    applyDraftState(item.id, { physical_qty: physicalQty, notes, dirty: true }, item.physical_qty, item.notes ?? "");

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }
    flushTimerRef.current = window.setTimeout(() => {
      void flushDraftQueue();
    }, 30000);
  }, [applyDraftState, draftState, flushDraftQueue, isDraftEditable]);

  const handleSaveDraftAll = useCallback(() => {
    void flushDraftQueue();
  }, [flushDraftQueue]);

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

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error(t("messages.exportEmpty"));
      return;
    }

    const escapeCSV = (value: string | number | null | undefined): string => {
      const normalized = String(value ?? "").replace(/"/g, '""');
      return `"${normalized}"`;
    };

    const headers = [
      t("dialog.columns.productCode"),
      t("dialog.columns.productName"),
      t("dialog.columns.systemQty"),
      t("dialog.columns.physicalQty"),
      t("dialog.columns.varianceQty"),
      t("dialog.columns.unitCost"),
      t("dialog.columns.notes"),
    ];

    const rows = items.map((item) => [
      escapeCSV(item.product_code ?? ""),
      escapeCSV(item.product_name ?? ""),
      escapeCSV(item.system_qty),
      escapeCSV(item.physical_qty ?? ""),
      escapeCSV(item.variance_qty),
      escapeCSV(item.unit_cost),
      escapeCSV(item.notes ?? ""),
    ]);

    const csvContent = [
      `# ${t("detail.exportTitle")} - ${opname.opname_number}`,
      `# ${t("table.warehouse")}: ${opname.warehouse_name ?? ""}`,
      `# ${t("form.date")}: ${opname.date}`,
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    link.href = url;
    link.setAttribute("download", `stock-opname-${opname.opname_number}-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("messages.exportSuccess"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("managerView.title")}</h2>
        <div className="flex items-center gap-2">
          {isDraftEditable && (
            <Button
              variant="outline"
              onClick={handleSaveDraftAll}
              className="cursor-pointer"
              disabled={isQueueSaving || !hasPendingDraft}
            >
              Save Draft
            </Button>
          )}
          <Button variant="outline" onClick={handleExportCSV} className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {t("actions.exportExcel")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items">{t("dialog.tabs.items")}</TabsTrigger>
          <TabsTrigger value="info">{t("dialog.tabs.info")}</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dialog.columns.productCode")}</TableHead>
                    <TableHead>{t("dialog.columns.productName")}</TableHead>
                    <TableHead className="text-right">{t("dialog.columns.systemQty")}</TableHead>
                    <TableHead className="text-right">{t("dialog.columns.physicalQty")}</TableHead>
                    <TableHead className="text-right">{t("dialog.columns.varianceQty")}</TableHead>
                    <TableHead>{t("dialog.columns.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {tCommon("noData")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const currentPhysical = getPhysicalQty(item.id, item.physical_qty);
                      const variance = currentPhysical === null ? null : currentPhysical - item.system_qty;
                      const isShrinkage = variance !== null && variance < 0;
                      const isOverstock = variance !== null && variance > 0;
                      const isUncounted = currentPhysical === null;

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.product_code}</TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="text-right">{item.system_qty}</TableCell>
                          <TableCell className="text-right">
                            {isDraftEditable ? (
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={currentPhysical ?? ""}
                                  className="w-28 text-right"
                                  placeholder="-"
                                  onChange={(e) => {
                                    const next = e.target.value === "" ? null : Number(e.target.value);
                                    queueDraftLine(item, Number.isNaN(next) ? null : next, getNotes(item.id, item.notes ?? ""));
                                  }}
                                />
                              </div>
                            ) : isUncounted ? (
                              <Badge variant="outline" className="text-xs">
                                {t("counterView.notCounted")}
                              </Badge>
                            ) : (
                              currentPhysical
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isUncounted ? (
                              <span className="text-muted-foreground">-</span>
                            ) : isShrinkage ? (
                              <span className="text-destructive font-medium">{variance}</span>
                            ) : isOverstock ? (
                              <span className="text-green-600 font-medium">+{variance}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {isDraftEditable ? (
                              <Input
                                value={getNotes(item.id, item.notes ?? "")}
                                placeholder={t("dialog.columns.notes")}
                                onChange={(e) => {
                                  queueDraftLine(item, getPhysicalQty(item.id, item.physical_qty), e.target.value);
                                }}
                              />
                            ) : (
                              item.notes
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div ref={loadMoreRef} className="h-8 w-full" aria-hidden="true" />
          {!isLoading && hasNextPage && isFetchingNextPage && (
            <div className="pt-4 flex justify-center text-sm text-muted-foreground">
              {tCommon("loading")}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <div className="rounded-lg border p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("table.opname_no")}</p>
                <p className="font-mono font-bold">{opname.opname_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("table.warehouse")}</p>
                <p>{opname.warehouse_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("form.date")}</p>
                <p>{opname.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("table.status")}</p>
                <p>{opname.status}</p>
              </div>
              {opname.description && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("form.description")}</p>
                  <p>{opname.description}</p>
                </div>
              )}
              {opname.ordered_by_name && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("employee.orderedBy")}</p>
                  <p>{opname.ordered_by_name}</p>
                </div>
              )}
              {opname.assigned_to_name && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("employee.assignedTo")}</p>
                  <p>{opname.assigned_to_name}</p>
                </div>
              )}
              {opname.journal_id && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("detail.journalId")}</p>
                  <p className="font-mono text-xs">{opname.journal_id}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});
