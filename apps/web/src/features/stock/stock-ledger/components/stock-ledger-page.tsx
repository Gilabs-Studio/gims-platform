"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ScrollText,
  TrendingUp,
  Clock,
  Hash,
  Layers,
} from "lucide-react";
import { PageMotion } from "@/components/motion";
import { AsyncSelect } from "@/components/ui/async-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Link, useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { productService } from "@/features/master-data/product/services/product-service";
import { useProduct } from "@/features/master-data/product/hooks/use-products";
import type { Product } from "@/features/master-data/product/types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { GoodsReceiptDetail } from "@/features/purchase/goods-receipt/components/goods-receipt-detail";
// StockOpnameDetailDialog removed: open opname page instead of dialog
import { OrderDetailModal } from "@/features/sales/order/components/order-detail-modal";
import type { SalesOrder } from "@/features/sales/order/types";
import { useStockLedger } from "../hooks/use-stock-ledger";

type TransactionTypeFilter = "all" | "GR" | "GI" | "OPNAME" | "TRANSFER" | "SO";
type LedgerBadgeVariant = "success" | "destructive" | "warning" | "info";

const TYPE_OPTIONS: Array<{ value: TransactionTypeFilter; labelKey: string }> =
  [
    { value: "all", labelKey: "filter.allTypes" },
    { value: "GR", labelKey: "transactionTypes.GR" },
    { value: "GI", labelKey: "transactionTypes.GI" },
    { value: "OPNAME", labelKey: "transactionTypes.OPNAME" },
    { value: "TRANSFER", labelKey: "transactionTypes.TRANSFER" },
    { value: "SO", labelKey: "transactionTypes.SO" },
  ];

function getTransactionTypeLabel(
  t: (key: string) => string,
  value: TransactionTypeFilter
): string {
  switch (value) {
    case "GR":
      return t("transactionTypes.GR");
    case "GI":
      return t("transactionTypes.GI");
    case "OPNAME":
      return t("transactionTypes.OPNAME");
    case "TRANSFER":
      return t("transactionTypes.TRANSFER");
    case "SO":
      return t("transactionTypes.SO");
    default:
      return t("filter.allTypes");
  }
}

function formatLedgerDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd MMM yyyy HH:mm");
}

function LedgerTableSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 7 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-none first:rounded-t-lg last:rounded-b-lg" />
      ))}
    </div>
  );
}

/* ─── Summary Stat Card ──────────────────────────────────────────── */
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: "brand" | "success" | "destructive" | "warning" | "purple" | "cyan" | "default";
}) {
  const accentMap = {
    brand: "text-brand bg-brand/10",
    success: "text-success bg-success/10",
    destructive: "text-destructive bg-destructive/10",
    warning: "text-warning bg-warning/10",
    purple: "text-purple bg-purple/10",
    cyan: "text-cyan bg-cyan/10",
    default: "text-muted-foreground bg-muted/40",
  };
  const iconClass = accentMap[accent ?? "default"];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 leading-tight">
          {label}
        </p>
        <p className="text-sm font-semibold tabular-nums leading-none mt-1">{value}</p>
      </div>
    </div>
  );
}

/* ─── Active Filter Pill ──────────────────────────────────────────── */
function FilterPill({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted">
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground"
          aria-label="Remove filter"
        >
          ×
        </button>
      )}
    </span>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export function StockLedgerPage() {
  const t = useTranslations("stock_ledger");
  const searchParams = useSearchParams();
  const router = useRouter();

  const productId = searchParams.get("product_id")?.trim() ?? "";
  const [transactionType, setTransactionType] =
    useState<TransactionTypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const canViewGR = useUserPermission("goods_receipt.read");
  const canViewOpname = useUserPermission("stock_opname.read");
  const canViewTransfer = useUserPermission("stock_movement.read");
  const canViewSalesOrder = useUserPermission("sales_order.read");

  const [refEntityOpen, setRefEntityOpen] = useState(false);
  const [refEntityType, setRefEntityType] = useState<string | null>(null);
  const [refEntityId, setRefEntityId] = useState<string | null>(null);

  const [soOpen, setSoOpen] = useState(false);
  const [soItem, setSoItem] = useState<SalesOrder | null>(null);

  const selectedProductQuery = useProduct(productId, { enabled: !!productId });
  const selectedProduct = selectedProductQuery.data?.data ?? null;
  const productDefaultOptions = selectedProduct ? [selectedProduct] : [];

  const ledgerQuery = useStockLedger(productId || null, {
    page,
    limit: pageSize,
    transaction_type:
      transactionType === "all" ? undefined : transactionType,
    date_from: dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined,
    date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });

  const ledgerResponse = ledgerQuery.data?.data;
  const ledgerRows = useMemo(() => ledgerResponse?.data ?? [], [ledgerResponse?.data]);
  const pagination = ledgerResponse?.meta;

  const hasDateFilter = !!dateRange?.from || !!dateRange?.to;
  const hasTypeFilter = transactionType !== "all";
  const hasProductFilter = !!productId;
  const activeFilterCount = [hasProductFilter, hasTypeFilter, hasDateFilter].filter(Boolean).length;

  const summary = useMemo(() => {
    const currentStock = selectedProduct?.current_stock ?? 0;
    const currentHpp = selectedProduct?.current_hpp ?? 0;
    const currentValue = currentStock * currentHpp;
    const latestMovement = ledgerRows[0]?.created_at ?? null;
    return {
      currentStock,
      currentValue,
      latestMovement,
      ledgerCount: pagination?.total ?? ledgerRows.length,
    };
  }, [ledgerRows, pagination?.total, selectedProduct?.current_hpp, selectedProduct?.current_stock]);

  const totalQtyIn = ledgerRows.reduce(
    (sum, item) => sum + (item.qty > 0 ? item.qty : 0),
    0
  );
  const totalQtyOut = ledgerRows.reduce(
    (sum, item) => sum + (item.qty < 0 ? Math.abs(item.qty) : 0),
    0
  );

  const handleProductChange = (nextProductId: string) => {
    setPage(1);
    const path = nextProductId
      ? `/stock/ledger?product_id=${encodeURIComponent(nextProductId)}`
      : "/stock/ledger";
    router.push(path);
  };

  const handleResetFilters = () => {
    setTransactionType("all");
    setDateRange(undefined);
    setPage(1);
    setPageSize(20);
    router.push("/stock/ledger");
  };

  const selectedProductLabel = selectedProduct
    ? `${selectedProduct.code} · ${selectedProduct.name}`
    : "-";

  const getTypeBadgeVariant = (type: string): LedgerBadgeVariant => {
    switch (type) {
      case "GR": return "success";
      case "GI": return "destructive";
      case "OPNAME": return "warning";
      case "TRANSFER": return "info";
      case "SO": return "info";
      default: return "info";
    }
  };

  const refHasPermission = (refType: string) =>
    (refType === "GR" && canViewGR) ||
    (refType === "OPNAME" && canViewOpname) ||
    (refType === "TRANSFER" && canViewTransfer) ||
    (refType === "SO" && canViewSalesOrder);

  const handleRefClick = (row: { transaction_type: string; transaction_id: string }) => {
    if (row.transaction_type === "SO" && canViewSalesOrder) {
      setSoItem({ id: row.transaction_id } as SalesOrder);
      setSoOpen(true);
      return;
    }

    if (row.transaction_type === "OPNAME" && canViewOpname) {
      // Open opname in its dedicated page
      router.push(`/stock/opname/${row.transaction_id}`);
      return;
    }

    const hasPermission =
      (row.transaction_type === "GR" && canViewGR) ||
      (row.transaction_type === "TRANSFER" && canViewTransfer);
    if (!hasPermission) return;
    setRefEntityType(row.transaction_type);
    setRefEntityId(row.transaction_id);
    setRefEntityOpen(true);
  };

  /* ── render ── */
  return (
    <PageMotion className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full gap-2 sm:w-auto"
        >
          <Link href="/stock/inventory">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("actions.backToInventory")}
          </Link>
        </Button>
      </div>

      {/* ── Filter panel ── */}
      <div className="space-y-3">
        {/* Product selector */}
        <AsyncSelect<Product>
          value={productId || undefined}
          onChange={handleProductChange}
          label={t("selector.label")}
          placeholder={t("selector.placeholder")}
          emptyMessage={t("selector.empty")}
          width="w-full"
          triggerClassName="h-10"
          defaultOptions={productDefaultOptions}
          preload
          fetcher={async (query) => {
            const response = await productService.list({
              page: 1,
              per_page: 20,
              search: query || undefined,
            });
            return response.data ?? [];
          }}
          getLabel={(item) => `${item.code} · ${item.name}`}
          getValue={(item) => item.id}
          renderOption={(item) => (
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {item.code}
                </div>
              </div>
              <Badge variant="soft" className="shrink-0 text-xs tabular-nums">
                {item.current_stock?.toLocaleString("id-ID") ?? 0}
              </Badge>
            </div>
          )}
        />

        {/* Type + Date + Reset row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto]">
          <Select
            value={transactionType}
            onValueChange={(value) => {
              setTransactionType(value as TransactionTypeFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder={t("filter.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {getTransactionTypeLabel(t, option.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangePicker
            dateRange={dateRange}
            onDateChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
          />

          <Button
            variant="ghost"
            size="sm"
            className="h-10 gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleResetFilters}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("actions.reset")}
          </Button>
        </div>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              {t("filter.activeFilters")} {activeFilterCount}
            </span>
            {hasProductFilter && (
              <FilterPill
                label={selectedProductLabel}
                onRemove={() => {
                  setPage(1);
                  router.push("/stock/ledger");
                }}
              />
            )}
            {hasTypeFilter && (
              <FilterPill
                label={getTransactionTypeLabel(t, transactionType)}
                onRemove={() => setTransactionType("all")}
              />
            )}
            {hasDateFilter && (
              <FilterPill
                label={t("filter.dateRange")}
                onRemove={() => setDateRange(undefined)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Summary stat cards ── */}
      {productId && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label={t("summary.currentStock")}
            value={summary.currentStock.toLocaleString("id-ID")}
            icon={Layers}
            accent="brand"
          />
          <StatCard
            label={t("summary.currentValue")}
            value={formatCurrency(summary.currentValue)}
            icon={TrendingUp}
            accent="purple"
          />
          <StatCard
            label={t("summary.ledgerEntries")}
            value={summary.ledgerCount.toLocaleString("id-ID")}
            icon={Hash}
          />
          <StatCard
            label={t("summary.totalQtyIn")}
            value={totalQtyIn.toLocaleString("id-ID")}
            icon={ArrowDownLeft}
            accent="success"
          />
          <StatCard
            label={t("summary.totalQtyOut")}
            value={totalQtyOut.toLocaleString("id-ID")}
            icon={ArrowUpRight}
            accent="destructive"
          />
          <StatCard
            label={t("summary.latestMovement")}
            value={
              summary.latestMovement
                ? formatLedgerDateTime(summary.latestMovement)
                : "-"
            }
            icon={Clock}
          />
        </div>
      )}

      {/* ── Table container ── */}
      <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm">
        {!productId ? (
          /* Empty — no product selected */
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground/60">
              <ScrollText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">{t("emptyState.title")}</h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                {t("emptyState.description")}
              </p>
            </div>
          </div>
        ) : ledgerQuery.isError ? (
          /* Error state */
          <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/8 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">{t("states.errorTitle")}</h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                {t("states.errorDescription")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => ledgerQuery.refetch()}
            >
              {t("actions.retry")}
            </Button>
          </div>
        ) : ledgerQuery.isLoading ? (
          /* Loading skeleton */
          <div className="p-5">
            <LedgerTableSkeleton />
          </div>
        ) : ledgerRows.length === 0 ? (
          /* No results */
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground/60">
              <ScrollText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">{t("table.noResults")}</h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                {t("description")}
              </p>
            </div>
          </div>
        ) : (
          /* Data table */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.date")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.type")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.reference")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.qtyIn")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.qtyOut")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.unitCost")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.averageCost")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.runningQty")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t("table.stockValue")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerRows.map((row) => {
                  const qtyIn = row.qty > 0 ? row.qty : 0;
                  const qtyOut = row.qty < 0 ? Math.abs(row.qty) : 0;

                  return (
                    <TableRow
                      key={row.id}
                      className="group border-b border-border/40 transition-colors last:border-0 hover:bg-muted/25"
                    >
                      <TableCell className="whitespace-nowrap py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatLedgerDateTime(row.created_at)}
                        </span>
                      </TableCell>

                      <TableCell className="py-3">
                        <Badge
                          variant={getTypeBadgeVariant(row.transaction_type)}
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        >
                          {row.transaction_type_label}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3">
                        <span
                          className={
                            refHasPermission(row.transaction_type)
                              ? "cursor-pointer font-mono text-xs font-bold text-primary hover:underline"
                              : "font-mono text-xs font-medium text-muted-foreground"
                          }
                          onClick={() => handleRefClick(row)}
                        >
                          {row.transaction_id}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        {qtyIn > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-success">
                            <ArrowDownLeft className="h-3 w-3" />
                            {qtyIn.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        {qtyOut > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-destructive">
                            <ArrowUpRight className="h-3 w-3" />
                            {qtyOut.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(row.unit_cost)}
                      </TableCell>

                      <TableCell className="py-3 text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(row.average_cost)}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <span className="font-mono text-xs font-semibold">
                          {row.running_qty.toLocaleString("id-ID")}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <span className="font-mono text-xs font-semibold">
                          {formatCurrency(row.stock_value)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination && productId && ledgerRows.length > 0 && (
        <div>
          <DataTablePagination
            pageIndex={pagination.page}
            pageSize={pagination.per_page}
            rowCount={pagination.total}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </div>
      )}
      <GoodsReceiptDetail
        open={refEntityOpen && refEntityType === "GR"}
        onClose={() => setRefEntityOpen(false)}
        goodsReceiptId={refEntityId}
      />

      <OrderDetailModal
        open={soOpen}
        onClose={() => setSoOpen(false)}
        order={soItem}
      />
    </PageMotion>
  );
}