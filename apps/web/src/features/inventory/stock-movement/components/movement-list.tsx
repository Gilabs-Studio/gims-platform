"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, AlertTriangle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useStockMovements } from "../hooks/use-movements";
import { MovementBadge } from "./movement-badge";
import { useWarehouses } from "@/features/master-data/warehouse/hooks/use-warehouses";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StockMovement, StockMovementType } from "../types";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { MovementDetailDialog } from "./movement-detail-dialog";

export function MovementList() {
  const t = useTranslations("stock_movement"); // Usage: t('title')
  const tCommon = useTranslations("common");
  
  // Filter States
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [productId, setProductId] = useState<string>("all");
  const [type, setType] = useState<StockMovementType | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockMovement | null>(null);

  const handleRowClick = (item: StockMovement) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  // Data Fetching
  const { data, isLoading, isError } = useStockMovements({
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
    warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
    product_id: productId !== "all" ? productId : undefined,
    type: type,
    start_date: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    end_date: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });

  // Lookup Data
  const { data: warehouseData } = useWarehouses({ page: 1, per_page: 100 });
  const warehouses = warehouseData?.data ?? [];

  // For Product Select - usually we want Async Combobox, but for now simple Select with top 100
  const { data: productData } = useProducts({ page: 1, per_page: 100 });
  const products = productData?.data ?? [];

  const stockResponse = data?.data;
  const movements = stockResponse?.data ?? [];
  const pagination = stockResponse?.meta?.pagination;

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {tCommon("error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button variant="outline" className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            Export
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Top Filters Row */}
        <div className="flex flex-wrap gap-3 items-center">
             <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setPage(1); }}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t("filters.warehouse")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("filters.warehouse")}</SelectItem>
                    {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
             
             <Select value={productId} onValueChange={(v) => { setProductId(v); setPage(1); }}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t("filters.product")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("filters.product")}</SelectItem>
                    {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
             </Select>

             <Select value={type} onValueChange={(v) => { setType(v as any); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t("filters.type")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("filters.type")}</SelectItem>
                    <SelectItem value="IN">IN (Receipt)</SelectItem>
                    <SelectItem value="OUT">OUT (Delivery)</SelectItem>
                    <SelectItem value="ADJUST">ADJUST</SelectItem>
                    <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                </SelectContent>
             </Select>

             <DateRangePicker 
                dateRange={dateRange} 
                onDateChange={(range) => { setDateRange(range); setPage(1); }} 
             />
        </div>

        {/* Search Row */}
        <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder={t("filters.search")}
               value={search}
               onChange={(e) => {
                 setSearch(e.target.value);
                 setPage(1);
               }}
               className="pl-9"
             />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.date")}</TableHead>
              <TableHead>{t("table.type")}</TableHead>
              <TableHead>{t("table.ref_no")}</TableHead>
              <TableHead>{t("table.source")}</TableHead>
              <TableHead className="text-right">{t("table.in")}</TableHead>
              <TableHead className="text-right">{t("table.out")}</TableHead>
              <TableHead className="text-right">{t("table.balance")}</TableHead>
              <TableHead className="text-right">{t("table.cost")}</TableHead>
              <TableHead>{t("table.user")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={9} className="h-16 text-center text-muted-foreground">
                            {tCommon("loading")}
                        </TableCell>
                    </TableRow>
                ))
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                   {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              movements.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(item)}
                >
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatDate(item.date)}
                  </TableCell>
                  <TableCell>
                    <MovementBadge type={item.type} />
                  </TableCell>
                  <TableCell>
                    <span 
                        className="font-mono text-xs font-bold text-primary hover:underline"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent double trigger if needed, though same action
                            handleRowClick(item);
                        }}
                    >
                        {item.ref_number}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={item.source}>
                    {item.source}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {item.qty_in > 0 ? `+${item.qty_in}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600">
                    {item.qty_out > 0 ? `-${item.qty_out}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {item.balance}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {formatCurrency(item.cost)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.creator?.name ?? "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon("page")} {pagination.page} {tCommon("of")} {pagination.total_pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_prev}
              onClick={() => setPage(page - 1)}
              className="cursor-pointer"
            >
              {tCommon("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_next}
              onClick={() => setPage(page + 1)}
              className="cursor-pointer"
            >
              {tCommon("next")}
            </Button>
          </div>
        </div>
      )}

      <MovementDetailDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        item={selectedItem} 
      />
    </div>
  );
}
