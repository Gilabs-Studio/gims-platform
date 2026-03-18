"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Plus, Search, MoreHorizontal, Send, CheckCircle2, XCircle, FileText, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useDeletePurchaseReturn, usePurchaseReturns, useUpdatePurchaseReturnStatus } from "../hooks/use-purchase-returns";
import { useGoodsReceipts } from "@/features/purchase/goods-receipt/hooks/use-goods-receipts";
import { PurchaseReturnDetail } from "./purchase-return-detail";
import { CreatePurchaseReturnDialog } from "./create-purchase-return-dialog";
import type { PurchaseReturn, PurchaseReturnStatus } from "../types";

export function PurchaseReturnsList() {
  const t = useTranslations("purchaseReturns");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selected, setSelected] = useState<PurchaseReturn | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canCreate = useUserPermission("purchase_return.create");
  const canUpdate = useUserPermission("purchase_return.update");
  const canDelete = useUserPermission("purchase_return.delete");
  const updateStatus = useUpdatePurchaseReturnStatus();
  const deleteReturn = useDeletePurchaseReturn();

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = usePurchaseReturns({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });
  const { data: goodsReceiptsData } = useGoodsReceipts({ per_page: 100 });

  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const goodsReceiptCodeMap = new Map((goodsReceiptsData?.data ?? []).map((gr) => [gr.id, gr.code]));

  if (isError) {
    return <div className="text-destructive">{t("common.error")}</div>;
  }

  const handleStatusChange = async (id: string, status: PurchaseReturnStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(t("common.updated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deletingId) {
      return;
    }

    try {
      await deleteReturn.mutateAsync(deletingId);
      toast.success(t("common.deleted"));
      setDeletingId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "DRAFT":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <FileText className="mr-1 h-3 w-3" />
            {t("status.draft")}
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="mr-1 h-3 w-3" />
            {t("status.submitted")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="mr-1 h-3 w-3" />
            {t("status.rejected")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
            placeholder={t("search")}
          />
        </div>
        <div className="flex-1" />
        {canCreate && (
          <Button className="cursor-pointer" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.goodsReceipt")}</TableHead>
              <TableHead>{t("columns.action")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
              <TableHead className="text-right">{t("columns.amount")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.return_number}</TableCell>
                  <TableCell>{goodsReceiptCodeMap.get(row.goods_receipt_id) ?? "-"}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.total_amount ?? 0)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(row)} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" />
                          {t("actions.view")}
                        </DropdownMenuItem>

                        {canUpdate && row.status === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(row.id, "SUBMITTED")} className="cursor-pointer text-primary focus:text-primary">
                            <Send className="mr-2 h-4 w-4" />
                            {t("actions.submit")}
                          </DropdownMenuItem>
                        )}

                        {canUpdate && row.status === "SUBMITTED" && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(row.id, "APPROVED")} className="cursor-pointer text-success focus:text-success">
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {t("actions.approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(row.id, "REJECTED")} className="cursor-pointer text-destructive focus:text-destructive">
                              <XCircle className="mr-2 h-4 w-4" />
                              {t("actions.reject")}
                            </DropdownMenuItem>
                          </>
                        )}

                        {canDelete && (row.status === "DRAFT" || row.status === "REJECTED") && (
                          <DropdownMenuItem onClick={() => setDeletingId(row.id)} className="cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}

      <PurchaseReturnDetail open={!!selected} onOpenChange={(open) => !open && setSelected(null)} item={selected} />
      <CreatePurchaseReturnDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title={t("actions.delete")}
        description={t("common.deleteConfirmation")}
        isLoading={deleteReturn.isPending}
      />
    </div>
  );
}
