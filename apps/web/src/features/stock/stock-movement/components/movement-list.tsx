"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Plus } from "lucide-react";
import { Link } from "@/i18n/routing";
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
import { useUserPermission } from "@/hooks/use-user-permission";
import { DeliveryDetailModal } from "@/features/sales/delivery/components/delivery-detail-modal";
import { GoodsReceiptDetail } from "@/features/purchase/goods-receipt/components/goods-receipt-detail";
import { StockOpnameDetailDialog } from "@/features/stock/stock-opname/components/stock-opname-detail-dialog";
import type { DeliveryOrder } from "@/features/sales/delivery/types";

export function MovementList() {
  const t = useTranslations("stock_movement"); // Usage: t('title')
  const tCommon = useTranslations("common");

  // Ref-entity permissions
  const canViewDelivery = useUserPermission("delivery_order.read");
  const canViewGR = useUserPermission("goods_receipt.read");
  const canViewOpname = useUserPermission("stock_opname.read");

  // Filter States
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [productId, setProductId] = useState<string>("all");
  const [type, setType] = useState<StockMovementType | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Movement detail dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockMovement | null>(null);

  // Ref-entity detail dialog state
  const [refEntityOpen, setRefEntityOpen] = useState(false);
  const [refEntityType, setRefEntityType] = useState<string | null>(null);
  const [refEntityId, setRefEntityId] = useState<string | null>(null);

  const handleRowClick = (item: StockMovement) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleRefClick = (item: StockMovement, e: React.MouseEvent) => {
    e.stopPropagation();
    const hasPermission =
      (item.ref_type === "DeliveryOrder" && canViewDelivery) ||
      (item.ref_type === "GoodsReceipt" && canViewGR) ||
      (item.ref_type === "StockOpname" && canViewOpname);
    if (!hasPermission) return;
    setRefEntityType(item.ref_type);
    setRefEntityId(item.ref_id);
    setRefEntityOpen(true);
  };

  const refHasPermission = (refType: string) =>
    (refType === "DeliveryOrder" && canViewDelivery) ||
    (refType === "GoodsReceipt" && canViewGR) ||
    (refType === "StockOpname" && canViewOpname);

  // Data Fetching
  const { data, isLoading, isError } = useStockMovements({
    page,
    per_page: pageSize,
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
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <Button variant="outline" className="cursor-pointer w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
          </Button>
          <Button asChild className="cursor-pointer w-full sm:w-auto">
            <Link href="/stock/movements/create">
              <Plus className="mr-2 h-4 w-4" />
              {tCommon("create")}
            </Link>
          </Button>
        </div>
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

             <Select value={type} onValueChange={(v) => { setType(v as StockMovementType | "all"); setPage(1); }}>
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
                      className={
                        refHasPermission(item.ref_type)
                          ? "cursor-pointer font-mono text-xs font-bold text-primary hover:underline"
                          : "font-mono text-xs font-medium text-muted-foreground"
                      }
                      onClick={(e) => handleRefClick(item, e)}
                    >
                      {item.ref_number}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={item.source}>
                    {item.source}
                  </TableCell>
                  <TableCell className="text-right font-bold text-success">
                    {item.qty_in > 0 ? `+${item.qty_in}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
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

      <MovementDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
      />

      {/* Ref-entity detail modals — only mounted when correct type is active */}
      <DeliveryDetailModal
        open={refEntityOpen && refEntityType === "DeliveryOrder"}
        onClose={() => setRefEntityOpen(false)}
        delivery={refEntityId ? ({ id: refEntityId } as DeliveryOrder) : null}
      />

      <GoodsReceiptDetail
        open={refEntityOpen && refEntityType === "GoodsReceipt"}
        onClose={() => setRefEntityOpen(false)}
        goodsReceiptId={refEntityId}
      />

      <StockOpnameDetailDialog
        open={refEntityOpen && refEntityType === "StockOpname"}
        onOpenChange={(open) => { if (!open) setRefEntityOpen(false); }}
        opnameId={refEntityType === "StockOpname" ? refEntityId : null}
      />
    </div>
  );
}
