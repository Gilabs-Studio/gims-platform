"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@/i18n/routing";
import { PageMotion } from "@/components/motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  Warehouse as WarehouseIcon,
  Package,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { inventoryService } from "@/features/stock/inventory/services/inventory-service";
import { useStockMovementProducts, type MovementType, type StockMovementSelectableProduct as SelectableProduct } from "../hooks/use-stock-movement-products";
import { useStockMovementWarehouses } from "../hooks/use-stock-movement-warehouses";
import { stockMovementService } from "../services/movement-service";

// ─── Batch Selector sub-component ────────────────────────────────────────────
function BatchSelector({
  productId,
  warehouseId,
  value,
  onChange,
  t,
}: {
  productId: string;
  warehouseId: string;
  value: string;
  onChange: (batchId: string) => void;
  t: ReturnType<typeof useTranslations<"stock_movement">>;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["movement-batches", warehouseId, productId],
    queryFn: () => inventoryService.getTreeBatches(warehouseId, productId, { page: 1, per_page: 100 }),
    enabled: !!productId && !!warehouseId,
    staleTime: 60_000,
  });

  // getTreeBatches returns ApiResponse<InventoryBatchesResponse>; unwrap both layers.
  const batches = data?.data?.data ?? [];

  // The Select component requires each <SelectItem /> to have a non-empty value string.
  // We represent the "auto" choice internally as the sentinel "__AUTO__" but
  // translate it to an empty string when invoking the external onChange so the
  // parent still stores "" for auto selection.
  const INTERNAL_AUTO = "__AUTO__";
  const internalValue = value === "" ? INTERNAL_AUTO : value;

  return (
    <Select value={internalValue} onValueChange={(v) => onChange(v === INTERNAL_AUTO ? "" : v)} disabled={isLoading}>
      <SelectTrigger className="h-8 text-sm w-56 cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <SelectValue placeholder={t("form.batchAuto")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={INTERNAL_AUTO} className="cursor-pointer">{t("form.batchAuto")}</SelectItem>
        {batches.map((b) => (
          <SelectItem key={b.id} value={b.id} className="cursor-pointer">
            <span className="font-mono text-xs">{b.batch_number}</span>
            <span className="text-muted-foreground ml-2">&middot; {b.available} avail</span>
            {b.expiry_date && (
              <span className="text-muted-foreground ml-1">&middot; exp {b.expiry_date}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StockMovementForm() {
  const t = useTranslations("stock_movement");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();

  // ─── Form state ───────────────────────────────────────────────────────────
  const [type, setType] = useState<MovementType>("TRANSFER");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [batchSelections, setBatchSelections] = useState<Record<string, string>>({});
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // ─── Data ─────────────────────────────────────────────────────────────────
  const {
    warehouses,
    isLoading: isWarehousesLoading,
    isLoadingMore: isWarehousesLoadingMore,
    hasNextPage: hasWarehousesNextPage,
    loadMore: loadMoreWarehouses,
  } = useStockMovementWarehouses(true);

  // OUT/TRANSFER → show only products that exist in the selected warehouse with stock
  const {
    products,
    isLoading: isProductsLoading,
    isLoadingMore,
    hasNextPage,
    loadMore,
  } = useStockMovementProducts(type, sourceWarehouseId, !!sourceWarehouseId);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Normalise to a single shape
  const rawProducts = products;

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return rawProducts;
    return rawProducts.filter(
      (p) =>
        p.product_name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q)
    );
  }, [rawProducts, productSearch]);

  // OUT/TRANSFER only allow products that actually have stock
  const selectableProducts = useMemo(() => {
    if (type === "IN") return filteredProducts;
    return filteredProducts.filter((p) => p.available > 0);
  }, [filteredProducts, type]);

  const hasMoreProducts = hasNextPage;
  const warehouseLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMoreProducts) {
      return;
    }

    const sentinel = loadMoreRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreProducts, isLoadingMore, loadMore]);

  useEffect(() => {
    if (!hasWarehousesNextPage) {
      return;
    }

    const sentinel = warehouseLoadMoreRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isWarehousesLoadingMore) {
          loadMoreWarehouses();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasWarehousesNextPage, isWarehousesLoadingMore, loadMoreWarehouses]);

  const allSelected =
    selectableProducts.length > 0 &&
    selectableProducts.every((p) => selectedIds.has(p.product_id));

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    setSelectedIds(new Set());
    setQuantities({});
    setBatchSelections({});
    if (newType !== "TRANSFER") setTargetWarehouseId("");
  };

  const handleSourceWarehouseChange = (id: string) => {
    setSourceWarehouseId(id);
    setSelectedIds(new Set());
    setQuantities({});
    setBatchSelections({});
    setProductSearch("");
  };

  const handleToggleAll = () => {
    const newSelected = new Set(selectedIds);
    const newQtys = { ...quantities };
    if (allSelected) {
      selectableProducts.forEach((p) => newSelected.delete(p.product_id));
    } else {
      selectableProducts.forEach((p) => {
        newSelected.add(p.product_id);
        if (!newQtys[p.product_id]) {
          newQtys[p.product_id] = type === "IN" ? 1 : p.available;
        }
      });
      setQuantities(newQtys);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleProduct = (product: SelectableProduct) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(product.product_id)) {
      newSelected.delete(product.product_id);
      setBatchSelections((prev) => {
        const next = { ...prev };
        delete next[product.product_id];
        return next;
      });
    } else {
      newSelected.add(product.product_id);
      setQuantities((prev) => ({
        ...prev,
        [product.product_id]: prev[product.product_id] ?? (type === "IN" ? 1 : product.available),
      }));
    }
    setSelectedIds(newSelected);
  };

  const handleQuantityChange = (productId: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      if (type !== "IN") {
        const product = rawProducts.find((p) => p.product_id === productId);
        const max = product?.available ?? Infinity;
        setQuantities((prev) => ({ ...prev, [productId]: Math.min(num, max) }));
      } else {
        setQuantities((prev) => ({ ...prev, [productId]: num }));
      }
    }
  };

  const canSubmit = useMemo(() => {
    if (!sourceWarehouseId) return false;
    if (type === "TRANSFER" && !targetWarehouseId) return false;
    if (type === "TRANSFER" && sourceWarehouseId === targetWarehouseId) return false;
    if (selectedIds.size === 0) return false;
    return Array.from(selectedIds).every((id) => {
      const qty = quantities[id] ?? 0;
      if (qty <= 0) return false;
      if (type !== "IN") {
        const product = rawProducts.find((p) => p.product_id === id);
        if (product && qty > product.available) return false;
      }
      return true;
    });
  }, [sourceWarehouseId, targetWarehouseId, selectedIds, quantities, type, rawProducts]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const batchReferenceNumber = referenceNumber || `MANUAL-${Date.now()}`;

      for (const productId of Array.from(selectedIds)) {
        await stockMovementService.createMovement({
          type,
          product_id: productId,
          warehouse_id: sourceWarehouseId,
          target_warehouse_id: type === "TRANSFER" ? targetWarehouseId : undefined,
          quantity: quantities[productId] ?? 0,
          reference_number: batchReferenceNumber,
          description: description || undefined,
          batch_id: type !== "IN" ? (batchSelections[productId] || undefined) : undefined,
        });
      }

      queryClient.removeQueries({ queryKey: ["stock-movements"] });
      toast.success(t("form.createSuccess"));
      router.push("/stock/movements");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      const message = apiError?.response?.data?.message;
      if (message?.includes("insufficient stock")) {
        toast.error(t("form.insufficientStock"));
      } else {
        toast.error(message ?? t("form.createError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Type card config ─────────────────────────────────────────────────────
  const typeConfig: Record<MovementType, { label: string; description: string; icon: React.ElementType }> = {
    TRANSFER: {
      label: t("form.typeTransfer"),
      description: t("form.typeTransferDesc"),
      icon: ArrowRightLeft,
    },
    IN: {
      label: t("form.typeIn"),
      description: t("form.typeInDesc"),
      icon: PackagePlus,
    },
    OUT: {
      label: t("form.typeOut"),
      description: t("form.typeOutDesc"),
      icon: PackageMinus,
    },
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageMotion className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" asChild className="cursor-pointer w-fit -ml-2">
          <Link href="/stock/movements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("title")}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{t("form.createTitle")}</h1>
        <p className="text-muted-foreground">{t("form.createDescription")}</p>
      </div>

      {/* ── Section 1: Movement Type ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{t("form.section.type")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["TRANSFER", "IN", "OUT"] as MovementType[]).map((mt) => {
              const { label, description: desc, icon: Icon } = typeConfig[mt];
              return (
                <button
                  key={mt}
                  type="button"
                  onClick={() => handleTypeChange(mt)}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all cursor-pointer",
                    type === mt
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Icon className="h-7 w-7" />
                  <div className="text-center space-y-0.5">
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground font-normal">{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Warehouse ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{t("form.section.warehouse")}</CardTitle>
          <CardDescription>
            {type === "TRANSFER" ? t("form.warehouseTransferHint") : t("form.warehouseHint")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn("grid gap-6", type === "TRANSFER" ? "md:grid-cols-[1fr_auto_1fr]" : "max-w-md")}>
            {/* Source */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {type === "TRANSFER" ? t("form.sourceWarehouse") : t("form.warehouse")}
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {isWarehousesLoading && warehouses.length === 0 ? (
                  <div className="space-y-2 py-2">
                    {[...Array(4)].map((_, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                        <Skeleton className="h-4 w-4 shrink-0" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ))}
                  </div>
                ) : null}
                {warehouses.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSourceWarehouseChange(w.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all cursor-pointer",
                      sourceWarehouseId === w.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <WarehouseIcon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        sourceWarehouseId === w.id ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium",
                        sourceWarehouseId === w.id && "text-primary"
                      )}
                    >
                      {w.name}
                    </span>
                  </button>
                ))}
                {hasWarehousesNextPage && (
                  <div ref={warehouseLoadMoreRef} className="px-1 pt-2 pb-1 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer min-w-40"
                      disabled={isWarehousesLoadingMore}
                      onClick={() => loadMoreWarehouses()}
                    >
                      {isWarehousesLoadingMore ? t("form.loadingMoreWarehouses") : t("form.loadMoreWarehouses")}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            {type === "TRANSFER" && (
              <Separator orientation="vertical" className="hidden md:block self-stretch" />
            )}

            {/* Target (TRANSFER only) */}
            {type === "TRANSFER" && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{t("form.targetWarehouse")}</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {warehouses
                    .filter((w) => w.id !== sourceWarehouseId)
                    .map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setTargetWarehouseId(w.id)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all cursor-pointer",
                          targetWarehouseId === w.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <WarehouseIcon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            targetWarehouseId === w.id ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "flex-1 text-sm font-medium",
                            targetWarehouseId === w.id && "text-primary"
                          )}
                        >
                          {w.name}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Item Selection ─────────────────────────────────── */}
      {sourceWarehouseId ? (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">{t("form.section.items")}</CardTitle>
                <CardDescription className="mt-1">
                  {selectedIds.size > 0
                    ? t("form.itemsSelected", { count: selectedIds.size })
                    : t("form.itemsHint")}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-52 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t("form.searchItems")}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isProductsLoading ? (
              <div className="divide-y">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Package className="h-12 w-12 opacity-20" />
                <p className="text-sm">{t("form.noItems")}</p>
              </div>
            ) : (
              <div className="divide-y">
                {/* Select-All header row */}
                <div className="flex items-center gap-4 px-6 py-3 bg-muted/40">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={handleToggleAll}
                    className="cursor-pointer"
                  />
                  <label
                    htmlFor="select-all"
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none"
                  >
                    {allSelected ? t("form.deselectAll") : t("form.selectAll")}
                    <Badge variant="outline" className="font-normal">
                      {selectableProducts.length} {t("form.items")}
                    </Badge>
                  </label>
                </div>

                {/* Product rows */}
                {filteredProducts.map((product) => {
                  const isSelectable = type === "IN" || product.available > 0;
                  const isSelected = selectedIds.has(product.product_id);
                  const qty =
                    quantities[product.product_id] ?? (type === "IN" ? 1 : product.available);
                  const showBatchSelector = isSelected && type !== "IN";

                  return (
                    <div
                      key={product.product_id}
                      className={cn(
                        "flex flex-col px-6 py-4 transition-colors gap-2",
                        isSelected && "bg-primary/5",
                        !isSelected && isSelectable && "hover:bg-muted/20",
                        !isSelectable && "opacity-40 pointer-events-none"
                      )}
                    >
                      {/* Main row: checkbox + product info + qty input */}
                      <div className="flex items-center gap-4">
                        <Checkbox
                          id={`p-${product.product_id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleToggleProduct(product)}
                          disabled={!isSelectable}
                          className="cursor-pointer shrink-0"
                        />
                        <label
                          htmlFor={`p-${product.product_id}`}
                          className="flex flex-1 items-center gap-4 cursor-pointer min-w-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{product.product_name}</p>
                            <p className="text-xs text-muted-foreground">{product.product_code}</p>
                          </div>
                          {type !== "IN" && (
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">{t("form.available")}</p>
                              <p className="text-sm font-semibold">
                                {product.available}
                                {product.uom_name && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    {product.uom_name}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </label>

                        {/* Quantity input — shown only when row is selected */}
                        {isSelected && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {t("form.qty")}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={type !== "IN" ? product.available : undefined}
                              value={qty}
                              onChange={(e) =>
                                handleQuantityChange(product.product_id, e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-24 h-8 text-right text-sm"
                            />
                            {product.uom_name && (
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                {product.uom_name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Batch selector row — OUT/TRANSFER only when product is selected */}
                      {showBatchSelector && (
                        <div className="ml-8 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">
                            {t("form.batch")}
                          </span>
                          <BatchSelector
                            productId={product.product_id}
                            warehouseId={sourceWarehouseId}
                            value={batchSelections[product.product_id] ?? ""}
                            onChange={(batchId) =>
                              setBatchSelections((prev) => ({ ...prev, [product.product_id]: batchId }))
                            }
                            t={t}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {hasNextPage && (
                  <div ref={loadMoreRef} className="px-6 py-4 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer min-w-40"
                      disabled={isLoadingMore}
                      onClick={() => loadMore()}
                    >
                      {isLoadingMore ? t("form.loadingMore") : t("form.loadMore")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <WarehouseIcon className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">Please select a warehouse to view available products</p>
          </CardContent>
        </Card>
      )}

      {/* ── Section 4: Reference Details ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{t("form.section.details")}</CardTitle>
          <CardDescription>{t("form.detailsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("form.referenceNumber")}</label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={t("form.referenceNumberPlaceholder")}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">{t("form.description")}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" asChild className="cursor-pointer">
          <Link href="/stock/movements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tCommon("cancel")}
          </Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="cursor-pointer min-w-40"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("form.submitting")}
            </>
          ) : (
            t("form.submit", { count: selectedIds.size })
          )}
        </Button>
      </div>
    </PageMotion>
  );
}
