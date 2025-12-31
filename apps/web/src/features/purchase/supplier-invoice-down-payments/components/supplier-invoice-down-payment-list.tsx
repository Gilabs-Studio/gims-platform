"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Table,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { SplitViewSidebar } from "@/components/ui/split-view/split-view-sidebar";
import { SplitViewContainer } from "@/components/ui/split-view/split-view-container";
import { SupplierInvoiceDownPaymentDetailModal } from "./supplier-invoice-down-payment-detail-modal";
import { SupplierInvoiceDownPaymentForm } from "./supplier-invoice-down-payment-form";
import { useSupplierInvoiceDownPaymentList } from "../hooks/use-supplier-invoice-down-payment-list";
import { useHasPermission } from "../hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SupplierInvoiceDownPayment } from "../types";
import { useTranslations } from "next-intl";
import type {
  CreateSupplierInvoiceDownPaymentFormData,
  UpdateSupplierInvoiceDownPaymentFormData,
} from "../schemas/supplier-invoice-down-payment.schema";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SupplierInvoiceDownPaymentList() {
  const {
    setPage,
    setPerPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    sortOrder,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingInvoice,
    setEditingInvoice,
    invoices,
    pagination,
    editingInvoiceData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handlePending,
    deletingInvoiceId,
    setDeletingInvoiceId,
    handleSortChange,
    deleteInvoice,
    createInvoice,
    updateInvoice,
    pendingInvoice,
  } = useSupplierInvoiceDownPaymentList();

  const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null);
  const [modalInvoiceId, setModalInvoiceId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "split">("split");
  const [selectedSplitInvoiceId, setSelectedSplitInvoiceId] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const hasManuallyToggledRef = useRef(false);
  const [isSplitSidebarOpen, setIsSplitSidebarOpen] = useState(() => !isMobile);

  useEffect(() => {
    if (!hasManuallyToggledRef.current) {
      const expected = !isMobile;
      startTransition(() => {
        setIsSplitSidebarOpen(expected);
      });
    }
    hasManuallyToggledRef.current = false;
  }, [isMobile]);

  const t = useTranslations("supplierInvoiceDownPayments.list");

  // Permission checks
  const hasViewPermission = useHasPermission("VIEW");
  const hasCreatePermission = useHasPermission("CREATE");
  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const handleViewInvoice = (invoiceId: number) => {
    // For table view, open modal
    setModalInvoiceId(invoiceId);
  };

  const handleSplitInvoiceClick = (invoice: SupplierInvoiceDownPayment) => {
    // For split view, show in container
    setSelectedSplitInvoiceId(invoice.id);
    setViewingInvoiceId(invoice.id);
  };

  const getStatusBadge = (status: SupplierInvoiceDownPayment["status"]) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("draft")}
          </Badge>
        );
      case "UNPAID":
        return (
          <Badge variant="default">
            <XCircle className="h-3 w-3 mr-1" />
            {t("unpaid")}
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("paid")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Map invoices to have string id for DataTable compatibility
  const invoicesWithStringId = invoices.map((r) => ({ ...r, id: r.id.toString() }));
  type InvoiceWithStringId = Omit<SupplierInvoiceDownPayment, "id"> & { id: string };

  const columns: Column<InvoiceWithStringId>[] = [
    {
      id: "code",
      header: t("code"),
      accessor: (row) => (
        <button
          onClick={() => handleViewInvoice(parseInt(row.id))}
          className="flex items-center gap-3 font-medium text-primary hover:underline cursor-pointer"
        >
          {row.code}
        </button>
      ),
      sortable: true,
      sortKey: "code",
    },
    {
      id: "invoice_number",
      header: t("invoiceNumber"),
      accessor: (row) => row.invoice_number ?? "-",
      sortable: true,
      sortKey: "invoice_number",
    },
    {
      id: "purchase_order",
      header: t("purchaseOrder"),
      accessor: (row) => row.purchase_order?.code ?? "-",
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => getStatusBadge(row.status),
    },
    {
      id: "invoice_date",
      header: t("invoiceDate"),
      accessor: (row) =>
        row.invoice_date ? new Date(row.invoice_date).toLocaleDateString() : "-",
      sortable: true,
      sortKey: "invoice_date",
    },
    {
      id: "due_date",
      header: t("dueDate"),
      accessor: (row) => (row.due_date ? new Date(row.due_date).toLocaleDateString() : "-"),
      sortable: true,
      sortKey: "due_date",
    },
    {
      id: "amount",
      header: t("amount"),
      accessor: (row) => formatCurrency(row.amount ?? 0),
      sortable: true,
      sortKey: "amount",
    },
    {
      id: "actions",
      header: t("actions"),
      sticky: true,
      accessor: () => null,
      actions: [
        // Always visible actions
        ...(hasViewPermission
          ? [
              {
                label: t("view"),
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: InvoiceWithStringId) => handleViewInvoice(parseInt(row.id)),
                show: true,
              },
            ]
          : []),
        ...(hasEditPermission
          ? [
              {
                label: t("edit"),
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: InvoiceWithStringId) => setEditingInvoice(parseInt(row.id)),
                show: (row: InvoiceWithStringId) => row.status === "DRAFT",
              },
            ]
          : []),
        ...(hasApprovePermission
          ? [
              {
                label: t("pending"),
                icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
                onClick: (row: InvoiceWithStringId) => handlePending(parseInt(row.id)),
                show: (row: InvoiceWithStringId) => row.status === "DRAFT",
                disabled: pendingInvoice.isPending,
              },
            ]
          : []),
        // Hidden in dropdown menu
        ...(hasDeletePermission
          ? [
              {
                label: t("delete"),
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
                onClick: (row: InvoiceWithStringId) => handleDeleteClick(parseInt(row.id)),
                show: false,
                variant: "destructive" as const,
              },
            ]
          : []),
      ],
    },
  ];

  if (!hasViewPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noPermission")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Header with Search and Actions */}
      {isMobile ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder={t("filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
              <SelectItem value="DRAFT">{t("draft")}</SelectItem>
              <SelectItem value="UNPAID">{t("unpaid")}</SelectItem>
              <SelectItem value="PAID">{t("paid")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "split" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("split")}
              className="flex-1 h-9 min-w-0"
            >
              <LayoutGrid className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{t("split")}</span>
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="flex-1 h-9 min-w-0"
            >
              <Table className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{t("table")}</span>
            </Button>
          </div>
          {hasCreatePermission && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
              className="w-full h-9"
            >
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{t("addInvoice")}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder={t("filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                <SelectItem value="DRAFT">{t("draft")}</SelectItem>
                <SelectItem value="UNPAID">{t("unpaid")}</SelectItem>
                <SelectItem value="PAID">{t("paid")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border rounded-md p-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "split" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("split")}
                    className="h-8 min-w-0 overflow-hidden"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate min-w-0">{t("split")}</span>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 min-w-0 overflow-hidden"
                  >
                    <Table className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate min-w-0">{t("table")}</span>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            {hasCreatePermission && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="hidden xl:inline ml-2">{t("addInvoice")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addInvoice")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Split View - Sidebar + Detail */}
      {viewMode === "split" && (
        <SplitViewContainer>
          <SplitViewSidebar
            items={invoices}
            selectedItemId={selectedSplitInvoiceId}
            onItemClick={handleSplitInvoiceClick}
            renderItem={(invoice) => (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium truncate cursor-pointer text-sm">
                      {invoice.code}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {invoice.purchase_order?.code ?? "-"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {getStatusBadge(invoice.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(invoice.amount ?? 0)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {invoice.invoice_number ?? "-"}
                  </p>
                </div>
              </div>
            )}
            emptyMessage={t("empty")}
            title={t("title")}
            className="w-80 shrink-0"
            isOpen={isSplitSidebarOpen}
            onClose={
              isMobile
                ? () => {
                    hasManuallyToggledRef.current = true;
                    setIsSplitSidebarOpen(false);
                  }
                : undefined
            }
            filterContent={
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder={t("filterStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                  <SelectItem value="DRAFT">{t("draft")}</SelectItem>
                  <SelectItem value="UNPAID">{t("unpaid")}</SelectItem>
                  <SelectItem value="PAID">{t("paid")}</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <div className="flex-1 min-w-0 overflow-hidden">
            {viewingInvoiceId ? (
              <SupplierInvoiceDownPaymentDetailModal
                invoiceId={viewingInvoiceId}
                open={!!viewingInvoiceId}
                onOpenChange={(open) => {
                  if (!open) {
                    setViewingInvoiceId(null);
                    setSelectedSplitInvoiceId(null);
                  }
                }}
                onInvoiceUpdated={() => {
                  // List will automatically refresh via query invalidation
                }}
                embedded={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t("selectInvoice")}</p>
              </div>
            )}
          </div>
        </SplitViewContainer>
      )}

      {/* Detail Modal (for table view) */}
      <SupplierInvoiceDownPaymentDetailModal
        invoiceId={modalInvoiceId}
        open={!!modalInvoiceId}
        onOpenChange={(open) => {
          if (!open) {
            setModalInvoiceId(null);
          }
        }}
        onInvoiceUpdated={() => {
          // List will automatically refresh via query invalidation
        }}
      />

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={invoicesWithStringId}
          isLoading={isLoading}
          emptyMessage={t("empty")}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  per_page: pagination.limit,
                  total: pagination.total,
                  total_pages: Math.ceil(pagination.total / pagination.limit),
                  has_next: pagination.page * pagination.limit < pagination.total,
                  has_prev: pagination.page > 1,
                }
              : undefined
          }
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          perPageOptions={[10, 20, 50, 100]}
          sort={
            sortBy && sortOrder
              ? {
                  sort_by: sortBy,
                  sort_order: sortOrder,
                }
              : undefined
          }
          sortableColumns={sortableColumns}
          onSortChange={handleSortChange}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
          </DialogHeader>
          <SupplierInvoiceDownPaymentForm
            onSubmit={async (data) => {
              await handleCreate(data as CreateSupplierInvoiceDownPaymentFormData);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createInvoice.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingInvoice && editingInvoiceData?.data && (
        <Dialog
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
        >
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
            </DialogHeader>
            <SupplierInvoiceDownPaymentForm
              invoice={editingInvoiceData.data}
              onSubmit={async (data) => {
                await handleUpdate(data as UpdateSupplierInvoiceDownPaymentFormData);
              }}
              onCancel={() => setEditingInvoice(null)}
              isLoading={updateInvoice.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingInvoiceId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingInvoiceId(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={t("deleteTitle")}
        description={
          deletingInvoiceId
            ? t("deleteDescriptionWithName", {
                code:
                  invoices.find((r) => r.id === deletingInvoiceId)?.code ?? t("deleteDescription"),
              })
            : t("deleteDescription")
        }
        itemName="supplier invoice down payment"
        isLoading={deleteInvoice.isPending}
      />
    </div>
  );
}




