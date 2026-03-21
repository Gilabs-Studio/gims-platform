"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertTriangle, CheckCircle2, XCircle, Package, Clock, Layers, TrendingDown, CalendarX, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useInventory, useInventoryMetrics } from "../hooks/use-inventory";
import { useWarehouses } from "@/features/master-data/warehouse/hooks/use-warehouses";
import { resolveImageUrl } from "@/lib/utils";

import { InventoryTree } from "./inventory-tree";
import { LayoutList, GanttChart, Eye } from "lucide-react"; // Icons for toggle
import { InventoryDetailDialog } from "./inventory-detail-dialog";
import { InventoryStockItem } from "../types";

type MetricFilterKey = "ok" | "low_stock" | "out_of_stock" | "overstock" | "has_expiring" | "has_expired";

const METRIC_FILTER_LABELS: Record<MetricFilterKey, string> = {
  ok: "Healthy Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  overstock: "Overstock",
  has_expiring: "Expiring within 30 days",
  has_expired: "Expired Batches (with remaining qty)",
};

function MetricCard({
  label,
  value,
  icon: Icon,
  colorClass,
  isLoading,
  filterKey,
  activeFilter,
  onFilterChange,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  isLoading: boolean;
  filterKey?: MetricFilterKey;
  activeFilter?: MetricFilterKey | null;
  onFilterChange?: (key: MetricFilterKey | null) => void;
}) {
  const isClickable = !!filterKey && !!onFilterChange;
  const isActive = isClickable && activeFilter === filterKey;

  return (
    <Card
      className={`flex-1 min-w-0 transition-all ${
        isClickable
          ? "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-primary/30"
          : ""
      } ${
        isActive ? "ring-2 ring-primary shadow-md" : ""
      }`}
      onClick={isClickable ? () => onFilterChange!(isActive ? null : filterKey) : undefined}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-md shrink-0 ${colorClass} ${isActive ? "ring-2 ring-white/50" : ""}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {isLoading ? (
            <Skeleton className="h-5 w-16 mt-0.5" />
          ) : (
            <p className={`text-lg font-bold tabular-nums leading-tight ${isActive ? "text-primary" : ""}`}>
              {value}
            </p>
          )}
        </div>
        {isActive && (
          <div className="ml-auto shrink-0">
            <X className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InventoryList() {
  const t = useTranslations("inventory");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  // Unified metric filter — null means no active filter
  const [activeMetricFilter, setActiveMetricFilter] = useState<MetricFilterKey | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryStockItem | null>(null);

  const handleViewDetails = (item: InventoryStockItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  // When a metric card is clicked, always switch to list to show filtered results
  const handleMetricFilter = (key: MetricFilterKey | null) => {
    setActiveMetricFilter(key);
    if (key !== null) setViewMode("list");
    setPage(1);
  };

  // Force list view when searching or when a metric filter is active
  const isSearchActive = !!debouncedSearch;
  const currentView = isSearchActive || activeMetricFilter ? "list" : viewMode;

  // Build inventory query params from active metric filter
  const inventoryFilterParams = (() => {
    if (!activeMetricFilter) return {};
    if (activeMetricFilter === "has_expiring") return { has_expiring: true };
    if (activeMetricFilter === "has_expired") return { has_expired: true };
    return { status: activeMetricFilter as "ok" | "low_stock" | "out_of_stock" | "overstock" };
  })();

  const { data, isLoading, isError } = useInventory({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
    ...inventoryFilterParams,
  });

  const { data: metricsData, isLoading: metricsLoading } = useInventoryMetrics();
  const metrics = metricsData?.data;

  const { data: warehouseData } = useWarehouses({ page: 1, per_page: 20 });
  const warehouses = warehouseData?.data ?? [];

  const inventory = data?.data?.data ?? [];
  const pagination = data?.data?.meta;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("status.ok")}
          </Badge>
        );
      case "low_stock":
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t("status.lowStock")}
          </Badge>
        );
      case "out_of_stock":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("status.outOfStock")}
          </Badge>
        );
      case "overstock":
        return (
          <Badge variant="info" className="gap-1">
            <Package className="h-3 w-3" />
            {t("status.overstock")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Inventory Metrics Cards */}
      <div className="flex flex-wrap gap-3">
        <MetricCard
          label="Total SKU"
          value={metrics?.total_items ?? 0}
          icon={Package}
          colorClass="bg-primary"
          isLoading={metricsLoading}
        />
        <MetricCard
          label="Total On Hand"
          value={metrics?.total_on_hand?.toLocaleString() ?? 0}
          icon={Layers}
          colorClass="bg-primary"
          isLoading={metricsLoading}
        />
        <MetricCard
          label="Healthy Stock"
          value={metrics?.ok_count ?? 0}
          icon={CheckCircle2}
          colorClass="bg-success"
          isLoading={metricsLoading}
          filterKey="ok"
          activeFilter={activeMetricFilter}
          onFilterChange={handleMetricFilter}
        />
        <MetricCard
          label="Low Stock"
          value={metrics?.low_stock_count ?? 0}
          icon={TrendingDown}
          colorClass="bg-warning"
          isLoading={metricsLoading}
          filterKey="low_stock"
          activeFilter={activeMetricFilter}
          onFilterChange={handleMetricFilter}
        />
        <MetricCard
          label="Out of Stock"
          value={metrics?.out_of_stock_count ?? 0}
          icon={XCircle}
          colorClass="bg-destructive"
          isLoading={metricsLoading}
          filterKey="out_of_stock"
          activeFilter={activeMetricFilter}
          onFilterChange={handleMetricFilter}
        />
        <MetricCard
          label="Expiring (30d)"
          value={metrics?.expiring_batches_30_day ?? 0}
          icon={Clock}
          colorClass="bg-warning"
          isLoading={metricsLoading}
          filterKey="has_expiring"
          activeFilter={activeMetricFilter}
          onFilterChange={handleMetricFilter}
        />
        <MetricCard
          label="Expired Batches"
          value={metrics?.expired_batches ?? 0}
          icon={CalendarX}
          colorClass="bg-rose"
          isLoading={metricsLoading}
          filterKey="has_expired"
          activeFilter={activeMetricFilter}
          onFilterChange={handleMetricFilter}
        />
      </div>

      {/* Active metric filter badge */}
      {activeMetricFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-2 py-1 px-3 text-sm font-normal">
            <span className="text-muted-foreground">Filtered:</span>
            <span className="font-medium">{METRIC_FILTER_LABELS[activeMetricFilter]}</span>
            <button
              onClick={() => handleMetricFilter(null)}
              className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          
          {currentView === "list" && (
            <Select
                value={warehouseId}
                onValueChange={(v) => {
                setWarehouseId(v);
                setPage(1);
                }}
            >
                <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("filter.warehouse")} />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">{t("filter.allWarehouses")}</SelectItem>
                {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                    {w.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center gap-2">
           {!isSearchActive && (
             <div className="flex items-center border rounded-md p-1 mr-2 bg-muted/20">
                <Button
                    variant={viewMode === "tree" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => {
                      setViewMode("tree");
                      setActiveMetricFilter(null);
                    }}
                >
                    <GanttChart className="h-4 w-4 mr-2" />
                    Tree
                </Button>
                <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setViewMode("list")}
                >
                    <LayoutList className="h-4 w-4 mr-2" />
                    List
                </Button>
             </div>
           )}

           {currentView === "list" && !activeMetricFilter && (
            <Button 
                variant="outline"
                onClick={() => handleMetricFilter("low_stock")}
                size="sm"
                className="cursor-pointer"
            >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {t("filter.showLowStockOnly")}
            </Button>
           )}
        </div>
      </div>

      {currentView === "tree" ? (
          <InventoryTree />
      ) : (
          <>
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[300px]">{t("table.product")}</TableHead>
                    <TableHead>{t("table.warehouse")}</TableHead>
                    <TableHead className="text-right">{t("table.onHand")}</TableHead>
                    <TableHead className="text-right">{t("table.reserved")}</TableHead>
                    <TableHead className="text-right font-bold">{t("table.available")}</TableHead>
                    <TableHead className="text-center">{t("table.range")}</TableHead>
                    <TableHead className="text-center w-[120px]">{t("table.status")}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                        {t("common.loading")}
                        </TableCell>
                    </TableRow>
                    ) : inventory.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        {t("common.noData")}
                        </TableCell>
                    </TableRow>
                    ) : (
                    inventory.map((item) => (
                        <TableRow key={`${item.product_id}-${item.warehouse_id}`}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md border shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                                {item.product_image_url ? (
                                    <img 
                                        src={resolveImageUrl(item.product_image_url)} 
                                        alt={item.product_name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xs font-bold text-muted-foreground">
                                        {item.product_name.substring(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium text-sm">{item.product_name}</span>
                                <span className="text-xs text-muted-foreground">{item.product_code}</span>
                            </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="text-sm text-muted-foreground">
                            {item.warehouse_name || t("common.noWarehouse")}
                            </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {item.on_hand.toLocaleString()} {item.uom_name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                            {item.reserved.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-primary">
                            {item.available.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                            {item.min_stock.toLocaleString()} - {item.max_stock.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                            {getStatusBadge(item.status)}
                            {item.has_expiring_batches && (
                                <div className="mt-1 flex items-center justify-center gap-1 text-destructive text-xs font-medium">
                                    <Clock className="h-3 w-3" />
                                    <span>{t("status.expiring")}</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="cursor-pointer"
                                onClick={() => handleViewDetails(item)}
                            >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))
                    )}
                </TableBody>
                </Table>
            </div>

            {pagination && (
                <DataTablePagination
                  pageIndex={pagination.page}
                  pageSize={pagination.per_page}
                  rowCount={pagination.total}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                />
            )}
            
            <InventoryDetailDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                item={selectedItem} 
            />
          </>
      )}
    </div>
  );
}
