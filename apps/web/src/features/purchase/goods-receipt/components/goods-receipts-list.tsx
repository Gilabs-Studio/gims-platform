"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Download,
  Eye,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Printer,
  XCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatDate } from "@/lib/utils";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";

import {
  useConfirmGoodsReceipt,
  useDeleteGoodsReceipt,
  useGoodsReceipts,
  useSubmitGoodsReceipt,
  useApproveGoodsReceipt,
  useRejectGoodsReceipt,
  useCloseGoodsReceipt,
  useConvertGoodsReceiptToSI,
} from "../hooks/use-goods-receipts";
import { goodsReceiptsService } from "../services/goods-receipts-service";
import type { GoodsReceiptListItem } from "../types";
import { GoodsReceiptAuditTrail } from "./goods-receipt-audit-trail";
import { GoodsReceiptDetail } from "./goods-receipt-detail";
import { GoodsReceiptForm } from "./goods-receipt-form";
import { GoodsReceiptStatusBadge } from "./goods-receipt-status-badge";
import { GoodsReceiptPrintDialog } from "./goods-receipt-print-dialog";

export function GoodsReceiptsList() {
  const t = useTranslations("goodsReceipt");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<GoodsReceiptListItem | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);

  const canCreate = useUserPermission("goods_receipt.create");
  const canExport = useUserPermission("goods_receipt.export");
  const canView = useUserPermission("goods_receipt.read");
  const canAuditTrail = useUserPermission("goods_receipt.audit_trail");
  const canConfirm = useUserPermission("goods_receipt.confirm");
  const canUpdate = useUserPermission("goods_receipt.update");
  const canDelete = useUserPermission("goods_receipt.delete");
  const canPrint = useUserPermission("goods_receipt.print");
  const canSubmit = useUserPermission("goods_receipt.submit");
  const canApprove = useUserPermission("goods_receipt.approve");
  const canReject = useUserPermission("goods_receipt.reject");
  const canClose = useUserPermission("goods_receipt.close");
  const canConvert = useUserPermission("goods_receipt.convert");
  const canViewSupplier = useUserPermission("supplier.read");

  const { data, isLoading, isError } = useGoodsReceipts({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items: GoodsReceiptListItem[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeleteGoodsReceipt();
  const confirmMutation = useConfirmGoodsReceipt();
  const submitMutation = useSubmitGoodsReceipt();
  const approveMutation = useApproveGoodsReceipt();
  const rejectMutation = useRejectGoodsReceipt();
  const closeMutation = useCloseGoodsReceipt();
  const convertMutation = useConvertGoodsReceiptToSI();

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
    );
  }

  const handleExport = async () => {
    try {
      const blob = await goodsReceiptsService.exportCsv({
        search: debouncedSearch || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
        limit: 10000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "goods_receipts.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleView = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const canShowActions =
    canView || canAuditTrail || canConfirm || canUpdate || canDelete ||
    canSubmit || canApprove || canReject || canClose || canConvert;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
            <SelectItem value="SUBMITTED">{t("status.submitted")}</SelectItem>
            <SelectItem value="APPROVED">{t("status.approved")}</SelectItem>
            <SelectItem value="CLOSED">{t("status.closed")}</SelectItem>
            <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
            <SelectItem value="CONFIRMED">{t("status.confirmed")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {canExport && (
          <Button
            variant="outline"
            onClick={handleExport}
            className="cursor-pointer"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("actions.export")}
          </Button>
        )}

        {canCreate && (
          <Button
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">{t("columns.code")}</TableHead>
              <TableHead>{t("columns.purchaseOrder")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              <TableHead>{t("columns.receiptDate")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell
                    className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => canView && handleView(it.id)}
                  >
                    {it.code}
                  </TableCell>
                  <TableCell>{it.purchase_order?.code ?? "-"}</TableCell>
                  <TableCell className="font-small">
                    {it.supplier ? (
                      canViewSupplier ? (
                        <button
                          onClick={() => {
                            setSelectedSupplierId(it.supplier!.id);
                            setIsSupplierOpen(true);
                          }}
                          className="text-primary hover:underline cursor-pointer text-left text-sm"
                        >
                          {it.supplier.name}
                        </button>
                      ) : (
                        <span>{it.supplier.name}</span>
                      )
                    ) : "-"}
                  </TableCell>
                  <TableCell>{formatDate(it.receipt_date)}</TableCell>
                  <TableCell>
                    <GoodsReceiptStatusBadge status={it.status ?? ""} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDate(it.created_at)}</span>
                      <span className="text-xs text-muted-foreground">
                        {it.created_at ? new Date(it.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canShowActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleView(it.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("actions.view")}
                            </DropdownMenuItem>
                          )}

                          {canUpdate && (it.status ?? "").toUpperCase() === "DRAFT" && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setEditingId(it.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("actions.edit")}
                            </DropdownMenuItem>
                          )}

                          {canSubmit && (it.status ?? "").toUpperCase() === "DRAFT" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-blue-600 focus:text-blue-600"
                              onClick={async () => {
                                try {
                                  await submitMutation.mutateAsync(it.id);
                                  toast.success(t("toast.submitted"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.submit")}
                            </DropdownMenuItem>
                          )}

                          {canConfirm && (it.status ?? "").toUpperCase() === "DRAFT" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-green-600 focus:text-green-600"
                              onClick={async () => {
                                try {
                                  await confirmMutation.mutateAsync(it.id);
                                  toast.success(t("toast.confirmed"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.confirm")}
                            </DropdownMenuItem>
                          )}

                          {canApprove && (it.status ?? "").toUpperCase() === "SUBMITTED" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-green-600 focus:text-green-600"
                              onClick={async () => {
                                try {
                                  await approveMutation.mutateAsync(it.id);
                                  toast.success(t("toast.approved"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.approve")}
                            </DropdownMenuItem>
                          )}

                          {canReject && (it.status ?? "").toUpperCase() === "SUBMITTED" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={async () => {
                                try {
                                  await rejectMutation.mutateAsync(it.id);
                                  toast.success(t("toast.rejected"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t("actions.reject")}
                            </DropdownMenuItem>
                          )}

                          {canClose && (it.status ?? "").toUpperCase() === "APPROVED" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-blue-600 focus:text-blue-600"
                              onClick={async () => {
                                try {
                                  await closeMutation.mutateAsync(it.id);
                                  toast.success(t("toast.closed"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.close")}
                            </DropdownMenuItem>
                          )}

                          {canConvert && (it.status ?? "").toUpperCase() === "CLOSED" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-blue-600 focus:text-blue-600"
                              onClick={async () => {
                                try {
                                  await convertMutation.mutateAsync(it.id);
                                  toast.success(t("toast.converted"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              {t("actions.convert")}
                            </DropdownMenuItem>
                          )}

                          {canAuditTrail && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setAuditId(it.id);
                                setAuditOpen(true);
                              }}
                            >
                              <History className="h-4 w-4 mr-2" />
                              {t("actions.auditTrail")}
                            </DropdownMenuItem>
                          )}

                          {canPrint && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setPrintingId(it.id)}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              {t("actions.print")}
                            </DropdownMenuItem>
                          )}

                          {canDelete && (it.status ?? "").toUpperCase() === "DRAFT" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => setDeletingItem(it)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("actions.delete")}
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
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <GoodsReceiptForm
        open={formOpen}
        goodsReceiptId={editingId}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
      />

      <GoodsReceiptDetail
        open={detailOpen}
        goodsReceiptId={detailId}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
      />

      <GoodsReceiptAuditTrail
        open={auditOpen}
        goodsReceiptId={detailId || auditId}
        onClose={() => {
          setAuditOpen(false);
          setAuditId(null);
        }}
      />

      {printingId && (
        <GoodsReceiptPrintDialog
          open={!!printingId}
          onClose={() => setPrintingId(null)}
          receiptId={printingId}
        />
      )}

      <SupplierDetailModal
        open={isSupplierOpen}
        onOpenChange={setIsSupplierOpen}
        supplierId={selectedSupplierId}
      />

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(v) => !v && setDeletingItem(null)}
        itemName={tCommon("goodsReceipt") || "goods receipt"}
        onConfirm={async () => {
          if (!deletingItem) return;
          try {
            await deleteMutation.mutateAsync(deletingItem.id);
            toast.success(t("toast.deleted"));
          } catch {
            toast.error(t("toast.failed"));
          } finally {
            setDeletingItem(null);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

