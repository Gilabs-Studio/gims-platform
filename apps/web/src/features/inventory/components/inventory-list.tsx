"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, CheckCircle2, XCircle, Package } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useInventory } from "../hooks/use-inventory";
import { useWarehouses } from "@/features/master-data/warehouse/hooks/use-warehouses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function InventoryList() {
  const t = useTranslations("inventory");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);

  const { data, isLoading, isError } = useInventory({
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
    warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
    low_stock: showLowStock || undefined,
  });

  const { data: warehouseData } = useWarehouses({ page: 1, per_page: 100 });
  const warehouses = warehouseData?.data ?? [];

  const inventory = data?.data?.data ?? [];
  const pagination = data?.data?.meta;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.ok")}
          </Badge>
        );
      case "low_stock":
        return (
          <Badge variant="warning" className="bg-yellow-500 hover:bg-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t("status.lowStock")}
          </Badge>
        );
      case "out_of_stock":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.outOfStock")}
          </Badge>
        );
      case "overstock":
        return (
          <Badge variant="secondary">
            <Package className="h-3 w-3 mr-1" />
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
        </div>
        
        <div className="flex items-center gap-2">
           <Button 
            variant={showLowStock ? "destructive" : "outline"}
            onClick={() => setShowLowStock(!showLowStock)}
            size="sm"
            className="cursor-pointer"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {showLowStock ? t("filter.showAll") : t("filter.showLowStockOnly")}
          </Button>
        </div>
      </div>

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => (
                <TableRow key={`${item.product_id}-${item.warehouse_id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-md border">
                        {item.product_image_url ? (
                          <AvatarImage src={item.product_image_url} alt={item.product_name} />
                        ) : null}
                        <AvatarFallback className="rounded-md bg-muted">
                          {item.product_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
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
            {t("common.page")} {pagination.page} {t("common.of")} {pagination.total_pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_prev}
              onClick={() => setPage(page - 1)}
              className="cursor-pointer"
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_next}
              onClick={() => setPage(page + 1)}
              className="cursor-pointer"
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
