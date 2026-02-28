"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  useApprovePurchaseRequisition,
  useConvertPurchaseRequisition,
  useDeletePurchaseRequisition,
  usePurchaseRequisitions,
  useRejectPurchaseRequisition,
} from "../hooks/use-purchase-requisitions";
import type { PurchaseRequisitionListItem } from "../types";
import { purchaseRequisitionsService } from "../services/purchase-requisitions-service";
import { PurchaseRequisitionForm } from "./purchase-requisition-form";
import { PurchaseRequisitionDetail } from "./purchase-requisition-detail";
import { PurchaseRequisitionAuditTrail } from "./purchase-requisition-audit-trail";
import { PurchaseRequisitionStatusBadge } from "./purchase-requisition-status-badge";
import { PurchaseRequisitionPrintDialog } from "./purchase-requisition-print-dialog";

export function PurchaseRequisitionsList() {
  const t = useTranslations("purchaseRequisition");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [deletingItem, setDeletingItem] = useState<PurchaseRequisitionListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const canCreate = useUserPermission("purchase_requisition.create");
  const canUpdate = useUserPermission("purchase_requisition.update");
  const canDelete = useUserPermission("purchase_requisition.delete");
  const canApprove = useUserPermission("purchase_requisition.approve");
  const canReject = useUserPermission("purchase_requisition.reject");
  const canConvert = useUserPermission("purchase_requisition.convert");
  const canExport = useUserPermission("purchase_requisition.export");
  const canAuditTrail = useUserPermission("purchase_requisition.audit_trail");
  const canView = useUserPermission("purchase_requisition.read");
  const canPrint = useUserPermission("purchase_requisition.print");

  const { data, isLoading, isError } = usePurchaseRequisitions({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items: PurchaseRequisitionListItem[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeletePurchaseRequisition();
  const approveMutation = useApprovePurchaseRequisition();
  const rejectMutation = useRejectPurchaseRequisition();
  const convertMutation = useConvertPurchaseRequisition();

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
    );
  }

  const handleExport = async () => {
    try {
      const blob = await purchaseRequisitionsService.exportCsv({
        search: debouncedSearch || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
        limit: 10000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "purchase_requisitions.csv";
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
              <TableHead>{t("columns.requestDate")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="text-right">{t("columns.total")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const status = (item.status ?? "").toLowerCase();
                const hasRowActions =
                  canView ||
                  canUpdate ||
                  canDelete ||
                  canApprove ||
                  canReject ||
                  canConvert ||
                  canAuditTrail;

                return (
                  <TableRow key={item.id}>
                    <TableCell
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => canView && handleView(item.id)}
                    >
                      {item.code}
                    </TableCell>
                    <TableCell>{formatDate(item.request_date)}</TableCell>
                    <TableCell className="font-medium">
                      {item.supplier?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <PurchaseRequisitionStatusBadge status={item.status ?? ""} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatDate(item.created_at)}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasRowActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canView && (
                              <DropdownMenuItem
                                onClick={() => handleView(item.id)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t("actions.view")}
                              </DropdownMenuItem>
                            )}

                            {canUpdate && status === "draft" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingId(item.id);
                                  setFormOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {t("actions.edit")}
                              </DropdownMenuItem>
                            )}

                            {canApprove && status === "draft" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await approveMutation.mutateAsync(item.id);
                                    toast.success(t("toast.approved"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                                className="cursor-pointer text-green-600 focus:text-green-600"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.approve")}
                              </DropdownMenuItem>
                            )}

                            {canReject && status === "draft" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await rejectMutation.mutateAsync(item.id);
                                    toast.success(t("toast.rejected"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t("actions.reject")}
                              </DropdownMenuItem>
                            )}

                            {canConvert && status === "approved" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const res = await convertMutation.mutateAsync(item.id);
                                    const poCode = res?.data?.purchase_order_code;
                                    toast.success(
                                      poCode
                                        ? `${t("toast.converted")} (PO: ${poCode})`
                                        : t("toast.converted"),
                                    );
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                                className="cursor-pointer text-blue-600 focus:text-blue-600"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {t("actions.convert")}
                              </DropdownMenuItem>
                            )}

                            {canAuditTrail && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setAuditId(item.id);
                                  setAuditOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <History className="h-4 w-4 mr-2" />
                                {t("actions.auditTrail")}
                              </DropdownMenuItem>
                            )}

                            {canPrint && (
                              <DropdownMenuItem
                                onClick={() => setPrintingId(item.id)}
                                className="cursor-pointer"
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {t("actions.print")}
                              </DropdownMenuItem>
                            )}

                            {canDelete && status === "draft" && (
                              <DropdownMenuItem
                                onClick={() => setDeletingItem(item)}
                                className="cursor-pointer text-destructive focus:text-destructive"
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
                );
              })
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
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
        />
      )}

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        itemName={tCommon("purchaseRequisition") || "purchase requisition"}
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

      <PurchaseRequisitionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
        requisitionId={editingId}
      />

      <PurchaseRequisitionDetail
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
        requisitionId={detailId}
      />

      <PurchaseRequisitionAuditTrail
        open={auditOpen}
        onClose={() => {
          setAuditOpen(false);
          setAuditId(null);
        }}
        requisitionId={detailId || auditId}
      />

      {printingId && (
        <PurchaseRequisitionPrintDialog
          open={!!printingId}
          onClose={() => setPrintingId(null)}
          requisitionId={printingId}
        />
      )}
    </div>
  );
}
