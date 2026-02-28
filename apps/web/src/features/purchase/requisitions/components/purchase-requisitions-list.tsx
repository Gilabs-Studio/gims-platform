"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  XCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PurchaseOrderDetail } from "@/features/purchase/orders/components/purchase-order-detail";

import {
  useApprovePurchaseRequisition,
  useConvertPurchaseRequisition,
  useDeletePurchaseRequisition,
  usePurchaseRequisitions,
  useRejectPurchaseRequisition,
  useSubmitPurchaseRequisition,
} from "../hooks/use-purchase-requisitions";
import type { PurchaseRequisitionListItem, PurchaseRequisitionStatus } from "../types";
import { purchaseRequisitionsService } from "../services/purchase-requisitions-service";
import { PurchaseRequisitionForm } from "./purchase-requisition-form";
import { PurchaseRequisitionDetail } from "./purchase-requisition-detail";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";
import { PurchaseRequisitionPrintDialog } from "./purchase-requisition-print-dialog";

export function PurchaseRequisitionsList() {
  const t = useTranslations("purchaseRequisition");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<PurchaseRequisitionStatus | "all">("all");

  const [deletingItem, setDeletingItem] = useState<PurchaseRequisitionListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<PurchaseRequisitionListItem["supplier"] | null>(null);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);

  const canCreate = useUserPermission("purchase_requisition.create");
  const canUpdate = useUserPermission("purchase_requisition.update");
  const canDelete = useUserPermission("purchase_requisition.delete");
  const canSubmit = useUserPermission("purchase_requisition.submit");
  const canApprove = useUserPermission("purchase_requisition.approve");
  const canReject = useUserPermission("purchase_requisition.reject");
  const canConvert = useUserPermission("purchase_requisition.convert");
  const canExport = useUserPermission("purchase_requisition.export");
  const canView = useUserPermission("purchase_requisition.read");
  const canPrint = useUserPermission("purchase_requisition.print");
  const canViewSupplier = useUserPermission("supplier.read");

  // Permission + scope for viewing linked Purchase Orders from the "Converted" badge.
  const hasPurchaseOrderRead = useUserPermission("purchase_order.read");
  const purchaseOrderScope = usePermissionScope("purchase_order.read");
  const { user } = useAuthStore();

  const { data, isLoading, isError } = usePurchaseRequisitions({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items: PurchaseRequisitionListItem[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeletePurchaseRequisition();
  const submitMutation = useSubmitPurchaseRequisition();
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

  /**
   * Determines whether a user can navigate to the linked Purchase Order from the "Converted" badge.
   * - ALL: always clickable
   * - OWN: only if the requisition was created by the current user
   * - DIVISION / AREA: optimistically allow — backend enforces access on the PO detail fetch
   */
  const canViewLinkedPurchaseOrder = (item: PurchaseRequisitionListItem): boolean => {
    if (!hasPurchaseOrderRead || !item.converted_to_purchase_order_id) return false;
    if (purchaseOrderScope === "ALL") return true;
    if (purchaseOrderScope === "OWN") {
      return item.requested_by === user?.id;
    }
    if (purchaseOrderScope === "DIVISION" || purchaseOrderScope === "AREA") return true;
    return false;
  };

  const getStatusBadge = (item: PurchaseRequisitionListItem) => {
    const status = (item.status ?? "").toUpperCase();
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.draft")}
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1" />
            {t("status.submitted")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.rejected")}
          </Badge>
        );
      case "CONVERTED": {
        const isClickable = canViewLinkedPurchaseOrder(item);
        return (
          <Badge
            variant="outline"
            onClick={
              isClickable
                ? () => setSelectedPurchaseOrderId(item.converted_to_purchase_order_id!)
                : undefined
            }
            className={
              (isClickable ? "cursor-pointer hover:border-primary hover:text-primary transition-colors " : "") +
              "text-xs font-medium"
            }
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.converted")}
          </Badge>
        );
      }
      default:
        return <Badge>{item.status}</Badge>;
    }
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

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as PurchaseRequisitionStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("common.filterBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.filterBy")} {t("common.status")}</SelectItem>
            <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
            <SelectItem value="SUBMITTED">{t("status.submitted")}</SelectItem>
            <SelectItem value="APPROVED">{t("status.approved")}</SelectItem>
            <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
            <SelectItem value="CONVERTED">{t("status.converted")}</SelectItem>
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
              <TableHead>{t("columns.requestDate")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              <TableHead>{t("columns.requestedBy")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="text-right">{t("columns.total")}</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const status = (item.status ?? "").toUpperCase();
                const hasRowActions =
                  canView ||
                  canUpdate ||
                  canDelete ||
                  canSubmit ||
                  canApprove ||
                  canReject ||
                  canConvert ||
                  canPrint;

                return (
                  <TableRow key={item.id}>
                    <TableCell
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => canView && handleView(item.id)}
                    >
                      {item.code}
                    </TableCell>
                    <TableCell>{formatDate(item.request_date)}</TableCell>
                    <TableCell>
                      {item.supplier && canViewSupplier ? (
                        <button
                          onClick={() => {
                            setSelectedSupplier(item.supplier);
                            setIsSupplierDialogOpen(true);
                          }}
                          className="text-primary hover:underline cursor-pointer text-left"
                        >
                          {item.supplier.name}
                        </button>
                      ) : (
                        <span>{item.supplier?.name ?? "-"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span>{item.employee?.name ?? item.user?.name ?? "-"}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_amount)}
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
                                {t("common.view")}
                              </DropdownMenuItem>
                            )}

                            {canUpdate && status === "DRAFT" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingId(item.id);
                                  setFormOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                            )}

                            {canSubmit && status === "DRAFT" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await submitMutation.mutateAsync(item.id);
                                    toast.success(t("toast.submitted"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                                className="cursor-pointer text-blue-600 focus:text-blue-600"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {t("actions.submit")}
                              </DropdownMenuItem>
                            )}

                            {status === "SUBMITTED" && (
                              <>
                                {canApprove && (
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
                                {canReject && (
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
                              </>
                            )}

                            {canConvert && status === "APPROVED" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const res = await convertMutation.mutateAsync(item.id);
                                    const poId = res?.data?.purchase_order_id;
                                    toast.success(t("toast.converted"));
                                    if (poId) setSelectedPurchaseOrderId(poId);
                                  } catch (err: unknown) {
                                    if (isAxiosError(err)) {
                                      const errStatus = err.response?.status;
                                      if (errStatus === 403) {
                                        toast.error(t("common.forbidden") ?? t("toast.failed"));
                                      } else {
                                        toast.error(t("toast.failed"));
                                      }
                                    } else {
                                      toast.error(t("toast.failed"));
                                    }
                                  }
                                }}
                                className="cursor-pointer text-blue-600 focus:text-blue-600"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {t("convertToOrder")}
                              </DropdownMenuItem>
                            )}

                            {canPrint && (
                              <DropdownMenuItem
                                onClick={() => setPrintingId(item.id)}
                                className="cursor-pointer text-violet-600 focus:text-violet-600"
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {t("print")}
                              </DropdownMenuItem>
                            )}

                            {canDelete && status === "DRAFT" && (
                              <DropdownMenuItem
                                onClick={() => setDeletingItem(item)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("common.delete")}
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
        itemName={t("common.quotation")}
        title={t("delete")}
        description={t("deleteDesc")}
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

      <SupplierDetailModal
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        supplierId={selectedSupplier?.id ?? null}
      />

      {/* Purchase Order detail modal — opened when user clicks a "Converted" badge */}
      <PurchaseOrderDetail
        open={!!selectedPurchaseOrderId}
        onClose={() => setSelectedPurchaseOrderId(null)}
        purchaseOrderId={selectedPurchaseOrderId}
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
