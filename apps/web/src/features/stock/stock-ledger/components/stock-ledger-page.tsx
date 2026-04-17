"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Filter,
  RotateCcw,
  ScrollText,
  Warehouse,
  WalletCards,
  X,
} from "lucide-react";
import { PageMotion } from "@/components/motion";
import { AsyncSelect } from "@/components/ui/async-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Link, useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { productService } from "@/features/master-data/product/services/product-service";
import { useProduct } from "@/features/master-data/product/hooks/use-products";
import type { Product } from "@/features/master-data/product/types";
import { useStockLedger } from "../hooks/use-stock-ledger";

type TransactionTypeFilter = "all" | "GR" | "GI" | "OPNAME" | "TRANSFER";

const TYPE_OPTIONS: Array<{ value: TransactionTypeFilter; labelKey: string }> = [
  { value: "all", labelKey: "filter.allTypes" },
  { value: "GR", labelKey: "transactionTypes.GR" },
  { value: "GI", labelKey: "transactionTypes.GI" },
  { value: "OPNAME", labelKey: "transactionTypes.OPNAME" },
  { value: "TRANSFER", labelKey: "transactionTypes.TRANSFER" },
];

function getTransactionTypeLabel(t: (key: string) => string, value: TransactionTypeFilter): string {
  switch (value) {
    case "GR":
      return t("transactionTypes.GR");
    case "GI":
      return t("transactionTypes.GI");
    case "OPNAME":
      return t("transactionTypes.OPNAME");
    case "TRANSFER":
      return t("transactionTypes.TRANSFER");
    default:
      return t("filter.allTypes");
  }
}

function formatLedgerDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return format(date, "dd MMM yyyy HH:mm");
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: ElementType;
  tone?: "neutral" | "success" | "warning" | "brand";
}) {
  const toneClasses = {
    neutral: "bg-muted text-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    brand: "bg-primary/15 text-primary",
  }[tone];

  return (
    <Card className="border-border/60 bg-background shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function StockLedgerPage() {
  const t = useTranslations("stock_ledger");
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialProductId = searchParams.get("product_id")?.trim() ?? "";
  const [productId, setProductId] = useState(initialProductId);
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setProductId(initialProductId);
  }, [initialProductId]);

  const selectedProductQuery = useProduct(productId, { enabled: !!productId });
  const selectedProduct = selectedProductQuery.data?.data ?? null;

  const productDefaultOptions = selectedProduct ? [selectedProduct] : [];

  const ledgerQuery = useStockLedger(productId || null, {
    page,
    limit: pageSize,
    transaction_type: transactionType === "all" ? undefined : transactionType,
    date_from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });

  const ledgerResponse = ledgerQuery.data?.data;
  const ledgerRows = ledgerResponse?.data ?? [];
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

  const totalQtyIn = ledgerRows.reduce((sum, item) => sum + (item.qty > 0 ? item.qty : 0), 0);
  const totalQtyOut = ledgerRows.reduce((sum, item) => sum + (item.qty < 0 ? Math.abs(item.qty) : 0), 0);

  const handleProductChange = (nextProductId: string) => {
    setProductId(nextProductId);
    setPage(1);
    const path = nextProductId ? `/stock/ledger?product_id=${encodeURIComponent(nextProductId)}` : "/stock/ledger";
    router.push(path);
  };

  const handleResetFilters = () => {
    setTransactionType("all");
    setDateRange(undefined);
    setPage(1);
    setPageSize(20);
  };

  const handleClearProduct = () => {
    setProductId("");
    setPage(1);
    router.push("/stock/ledger");
  };

  const selectedProductLabel = selectedProduct
    ? `${selectedProduct.code} · ${selectedProduct.name}`
    : "-";

  const getTypeBadgeClassName = (type: string) => {
    switch (type) {
      case "GR":
        return "border-success/40 bg-success/10 text-success";
      case "GI":
        return "border-destructive/40 bg-destructive/10 text-destructive";
      case "OPNAME":
        return "border-warning/40 bg-warning/10 text-warning";
      case "TRANSFER":
        return "border-primary/40 bg-primary/10 text-primary";
      default:
        return "";
    }
  };

  return (
    <PageMotion className="space-y-5 p-4 md:p-6">
      <Card className="border-border/60 bg-background shadow-sm">
        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit gap-2 rounded-full px-3 py-1">
                <ScrollText className="h-3.5 w-3.5" />
                {t("badge")}
              </Badge>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{t("subtitle")}</p>
            </div>

            <Button asChild variant="outline" className="cursor-pointer w-full sm:w-auto">
              <Link href="/stock/inventory">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("actions.backToInventory")}
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("selector.label")}</p>
              <AsyncSelect<Product>
                value={productId || undefined}
                onChange={(value) => handleProductChange(value)}
                label={t("selector.label")}
                placeholder={t("selector.placeholder")}
                emptyMessage={t("selector.empty")}
                width="w-full"
                triggerClassName="h-11 rounded-lg"
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
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="truncate text-xs text-muted-foreground font-mono">{item.code}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {item.current_stock?.toLocaleString("id-ID") ?? 0}
                    </Badge>
                  </div>
                )}
              />
            </div>

            <Button
              variant="ghost"
              className="cursor-pointer lg:mt-6"
              onClick={handleClearProduct}
              disabled={!productId}
            >
              <X className="mr-2 h-4 w-4" />
              {t("actions.clearProduct")}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("filter.transactionType")}</p>
              <Select
                value={transactionType}
                onValueChange={(value) => {
                  setTransactionType(value as TransactionTypeFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
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
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("filter.dateRange")}</p>
              <DateRangePicker
                dateRange={dateRange}
                onDateChange={(range) => {
                  setDateRange(range);
                  setPage(1);
                }}
              />
            </div>

            <Button variant="outline" className="cursor-pointer lg:mt-6" onClick={handleResetFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("actions.reset")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              {t("filter.activeFilters")} {activeFilterCount}
            </Badge>
            {hasProductFilter && <Badge variant="outline" className="rounded-full px-3 py-1">{selectedProductLabel}</Badge>}
            {hasTypeFilter && (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {t("filter.transactionType")}: {getTransactionTypeLabel(t, transactionType)}
              </Badge>
            )}
            {hasDateFilter && <Badge variant="outline" className="rounded-full px-3 py-1">{t("filter.dateRange")}</Badge>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label={t("summary.currentStock")}
          value={productId ? summary.currentStock.toLocaleString("id-ID") : "-"}
          icon={Warehouse}
          tone="brand"
        />
        <SummaryCard
          label={t("summary.currentValue")}
          value={productId ? formatCurrency(summary.currentValue) : "-"}
          icon={WalletCards}
          tone="success"
        />
        <SummaryCard
          label={t("summary.ledgerEntries")}
          value={productId ? summary.ledgerCount.toLocaleString("id-ID") : "-"}
          icon={ScrollText}
          tone="neutral"
        />
        <SummaryCard
          label={t("summary.latestMovement")}
          value={summary.latestMovement ? formatLedgerDateTime(summary.latestMovement) : "-"}
          icon={CalendarDays}
          tone="warning"
        />
        <SummaryCard
          label={t("summary.totalQtyIn")}
          value={totalQtyIn.toLocaleString("id-ID")}
          icon={Warehouse}
          tone="success"
        />
        <SummaryCard
          label={t("summary.totalQtyOut")}
          value={totalQtyOut.toLocaleString("id-ID")}
          icon={CircleDollarSign}
          tone="warning"
        />
      </div>

      <Card className="overflow-hidden border-border/60 bg-background shadow-sm">
        <CardContent className="p-0">
          {!productId ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40 text-muted-foreground shadow-sm">
                <ScrollText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{t("emptyState.title")}</h2>
                <p className="max-w-md text-sm text-muted-foreground">{t("emptyState.description")}</p>
              </div>
            </div>
          ) : ledgerQuery.isError ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{t("states.errorTitle")}</h2>
                <p className="max-w-md text-sm text-muted-foreground">{t("states.errorDescription")}</p>
              </div>
              <Button variant="outline" className="cursor-pointer" onClick={() => ledgerQuery.refetch()}>
                {t("actions.retry")}
              </Button>
            </div>
          ) : ledgerQuery.isLoading ? (
            <div className="p-5 md:p-6">
              <LedgerTableSkeleton />
            </div>
          ) : ledgerRows.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40 text-muted-foreground shadow-sm">
                <ScrollText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{t("table.noResults")}</h2>
                <p className="max-w-md text-sm text-muted-foreground">{t("description")}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t("table.date")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("table.type")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("table.reference")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("table.qtyIn")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("table.qtyOut")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("table.unitCost")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("table.averageCost")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("table.runningQty")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("table.stockValue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerRows.map((row) => {
                    const qtyIn = row.qty > 0 ? row.qty : 0;
                    const qtyOut = row.qty < 0 ? Math.abs(row.qty) : 0;

                    return (
                      <TableRow key={row.id} className="hover:bg-muted/40">
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-medium">
                          {formatLedgerDateTime(row.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`rounded-full ${getTypeBadgeClassName(row.transaction_type)}`}>
                            {row.transaction_type_label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{row.transaction_id}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">{qtyIn.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right font-mono text-rose-600">{qtyOut.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.unit_cost)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.average_cost)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{row.running_qty.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatCurrency(row.stock_value)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination && productId && ledgerRows.length > 0 && (
        <div className="rounded-2xl border bg-background p-3 shadow-sm">
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
    </PageMotion>
  );
}
