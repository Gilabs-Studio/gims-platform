"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, Download, Eye, MoreHorizontal, Pencil, Send, CheckCircle, XCircle, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { useStockOpnames, useDeleteStockOpname, useUpdateStockOpnameStatus } from "../hooks/use-stock-opnames";
import { StockOpnameStatusBadge } from "./stock-opname-status-badge";
import { useWarehouses } from "@/features/master-data/warehouse/hooks/use-warehouses";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatDate } from "@/lib/utils";
import { StockOpnameStatus, StockOpname } from "../types";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { StockOpnameDetailDialog } from "./stock-opname-detail-dialog";
import { EditStockOpnameDialog } from "./edit-stock-opname-dialog";
import { CreateStockOpnameDialog } from "./stock-opname-form";
import { useUserPermission } from "@/hooks/use-user-permission";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { toast } from "sonner";

function getInitialOpenStockOpnameFromURL(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("open_stock_opname");
}

export function StockOpnameList() {
  const t = useTranslations("stock_opname");
  const tCommon = useTranslations("common");

  // Permissions
  const canCreate = useUserPermission("stock_opname.create");
  const canDelete = useUserPermission("stock_opname.delete");
  const canRead = useUserPermission("stock_opname.read");
  const canUpdate = useUserPermission("stock_opname.update");
  const canApprove = useUserPermission("stock_opname.approve");
  
  // Dialog State
    const [selectedOpnameId, setSelectedOpnameId] = useState<string | null>(getInitialOpenStockOpnameFromURL);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpnameOpen, setEditOpnameOpen] = useState(false);
    const [editingOpname, setEditingOpname] = useState<StockOpname | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleView = (id: string) => {
    setSelectedOpnameId(id);
    setDetailOpen(true);
  };

    useEffect(() => {
        if (selectedOpnameId) {
            setDetailOpen(true);
        }
    }, [selectedOpnameId]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const searchParams = new URLSearchParams(window.location.search);
        if (!searchParams.get("open_stock_opname")) return;

        searchParams.delete("open_stock_opname");
        const nextQuery = searchParams.toString();
        const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
        window.history.replaceState(null, "", nextURL);
    }, []);

  // Filter States
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [status, setStatus] = useState<StockOpnameStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Data Fetching
  const { data, isLoading, isError } = useStockOpnames({
    page,
    per_page: perPage,
    search: debouncedSearch || undefined,
    warehouse_id: warehouseId !== "all" ? warehouseId : undefined,
    status: status !== "all" ? status : undefined,
    start_date: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    end_date: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });
  
  const deleteMutation = useDeleteStockOpname();
  const statusMutation = useUpdateStockOpnameStatus();

  // Warehouses for filter
  const { data: warehouseData } = useWarehouses({ page: 1, per_page: 20 });
  const warehouses = warehouseData?.data ?? [];

    const opnames: StockOpname[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleDelete = async () => {
      if (deletingId) {
          try {
              await deleteMutation.mutateAsync(deletingId);
              toast.success(tCommon("deleted"));
              setDeletingId(null);
          } catch {
              toast.error(tCommon("error"));
          }
      }
  }

  const handleStatusChange = async (id: string, newStatus: StockOpnameStatus) => {
      try {
          await statusMutation.mutateAsync({
              id,
              data: { status: newStatus }
          });
          toast.success(tCommon("saved"));
      } catch {
          toast.error(tCommon("error"));
      }
  };

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {tCommon("error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="cursor-pointer">
                <Download className="h-4 w-4 mr-2" />
                Export
            </Button>
            {canCreate && (
                <Button 
                    className="cursor-pointer"
                    onClick={() => setCreateOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("create")}
                </Button>
            )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Top Filters Row */}
        <div className="flex flex-wrap gap-3 items-center">
            <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setPage(1); }}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t("filter.warehouse")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("filter.warehouse")}</SelectItem>
                    {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            
            <Select value={status} onValueChange={(v: string) => { setStatus(v as StockOpnameStatus | "all"); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("filter.status")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("filter.status")}</SelectItem>
                    <SelectItem value="draft">{t("status.draft")}</SelectItem>
                    <SelectItem value="pending">{t("status.pending")}</SelectItem>
                    <SelectItem value="approved">{t("status.approved")}</SelectItem>
                    <SelectItem value="posted">{t("status.posted")}</SelectItem>
                    <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
                </SelectContent>
            </Select>

            <DateRangePicker 
                dateRange={dateRange} 
                onDateChange={(range) => { setDateRange(range); setPage(1); }}
            />
        </div>

        {/* Search Row */}
        <div className="relative w-full">
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
      </div>

      {/* Manual Table Implementation */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.opname_no")}</TableHead>
              <TableHead>{t("table.warehouse")}</TableHead>
              <TableHead className="w-[150px]">{t("table.date")}</TableHead>
              <TableHead className="w-[150px]">{t("table.status")}</TableHead>
              <TableHead className="text-center w-[120px]">{t("table.variance")}</TableHead>
              <TableHead className="w-[100px] text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                            {tCommon("loading")}
                        </TableCell>
                    </TableRow>
                ))
            ) : opnames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                   {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
                opnames.map((row) => (
                    <TableRow 
                        key={row.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleView(row.id)}
                    >
                        <TableCell>
                            <span 
                               className="font-mono text-xs font-bold text-primary hover:underline"
                            >
                               {row.opname_number}
                            </span>
                        </TableCell>
                        <TableCell>{row.warehouse_name}</TableCell>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell><StockOpnameStatusBadge status={row.status} /></TableCell>
                        <TableCell className="text-center">
                            {(() => {
                                const variance = row.total_variance_qty;
                                if (variance === 0 || variance === undefined) {
                                     return <span className="text-muted-foreground text-sm">-</span>;
                                }
                                return variance > 0 ? (
                                     <span className="font-medium" style={{ color: 'hsl(var(--chart-2))' }}>
                                         +{variance}
                                     </span>
                                ) : (
                                     <span className="font-medium" style={{ color: 'hsl(var(--chart-4))' }}>
                                         {variance}
                                     </span>
                                );
                            })()}
                        </TableCell>
                        <TableCell className="text-right">
                           { (canRead || canCreate || (row.status === 'draft' && canDelete)) && (
                               <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="cursor-pointer">
                                           <MoreHorizontal className="h-4 w-4" />
                                       </Button>
                                   </DropdownMenuTrigger>
                                    {/* Action Buttons */}
                                   <DropdownMenuContent align="end">
                                       {(canRead || canCreate) && (
                                           <DropdownMenuItem onClick={() => handleView(row.id)} className="cursor-pointer">
                                               <Eye className="h-4 w-4 mr-2" />
                                               {t("table.view")}
                                           </DropdownMenuItem>
                                       )}
                                       
                                       {row.status === 'draft' && canUpdate && (
                                            <>
                                                <DropdownMenuItem 
                                                    onClick={() => {
                                                        setEditingOpname(row);
                                                        setEditOpnameOpen(true);
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    {t("table.edit")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleStatusChange(row.id, 'pending')}
                                                    className="cursor-pointer"
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {t("actions.submit")}
                                                </DropdownMenuItem>
                                            </>
                                       )}

                                       {row.status === 'pending' && canApprove && (
                                            <>
                                                <DropdownMenuItem 
                                                    onClick={() => handleStatusChange(row.id, 'approved')}
                                                    className="cursor-pointer text-success focus:text-success focus:bg-green-50"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    {t("actions.approve")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleStatusChange(row.id, 'rejected')}
                                                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    {t("actions.reject")}
                                                </DropdownMenuItem>
                                            </>
                                       )}

                                       {row.status === 'approved' && canUpdate && (
                                            <DropdownMenuItem 
                                                onClick={() => handleStatusChange(row.id, 'posted')}
                                                className="cursor-pointer"
                                            >
                                                <Archive className="h-4 w-4 mr-2" />
                                                {t("actions.post")}
                                            </DropdownMenuItem>
                                       )}

                                       {row.status === 'draft' && canDelete && (
                                           <DropdownMenuItem 
                                               onClick={() => setDeletingId(row.id)}
                                               className="cursor-pointer text-destructive focus:text-destructive"
                                           >
                                               <Trash2 className="h-4 w-4 mr-2" />
                                               {t("table.delete")}
                                           </DropdownMenuItem>
                                       )}
                                   </DropdownMenuContent>
                               </DropdownMenu>
                           )}
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
            setPerPage(newSize);
            setPage(1);
          }}
        />
      )}
      
      <StockOpnameDetailDialog 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
        opnameId={selectedOpnameId} 
      />
      
      <CreateStockOpnameDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
      />

      {editingOpname && (
          <EditStockOpnameDialog
            open={editOpnameOpen}
            onOpenChange={(open) => {
                setEditOpnameOpen(open);
                if (!open) setEditingOpname(null);
            }}
            opname={editingOpname}
          />
      )}
      
      <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("deleteConfirmation.title")}
          description={t("deleteConfirmation.description")}
          itemName={opnames.find(o => o.id === deletingId)?.opname_number || ""}
          isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
