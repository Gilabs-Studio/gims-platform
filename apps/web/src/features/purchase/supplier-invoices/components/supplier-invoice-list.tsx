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
  Table,
  LayoutGrid,
  FileText,
  Clock,
  AlertCircle,
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
import { SupplierInvoiceDetailModal } from "./supplier-invoice-detail-modal";
import { SupplierInvoiceForm } from "./supplier-invoice-form";
import { useSupplierInvoiceList } from "../hooks/use-supplier-invoice-list";
import { useHasPermission } from "../hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SupplierInvoice } from "../types";
import { useTranslations } from "next-intl";
import type {
  CreateSupplierInvoiceFormData,
  UpdateSupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SupplierInvoiceList() {
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
    handleSetPending,
    deletingInvoiceId,
    setDeletingInvoiceId,
    handleSortChange,
    deleteInvoice,
    createInvoice,
    updateInvoice,
    setPendingInvoice,
  } = useSupplierInvoiceList();

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

  const t = useTranslations("supplierInvoices.list");

  // Permission checks
  const hasViewPermission = useHasPermission("VIEW");
  const hasCreatePermission = useHasPermission("CREATE");
  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");
  const hasDetailPermission = useHasPermission("DETAIL");

  const handleViewInvoice = (invoiceId: number) => {
    setModalInvoiceId(invoiceId);
  };

  const handleSplitInvoiceClick = (invoice: SupplierInvoice) => {
    setSelectedSplitInvoiceId(invoice.id);
    setViewingInvoiceId(invoice.id);
  };

  const getStatusBadge = (status: SupplierInvoice["status"]) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            {t("draft")}
          </Badge>
        );
      case "UNPAID":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t("unpaid")}
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("paid")}
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {t("partial")}
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t("overdue")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const invoicesWithStringId = invoices.map((i) => ({ ...i, id: i.id.toString() }));
  type InvoiceWithStringId = Omit<SupplierInvoice, "id"> & { id: string };

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
      sortable: true,
      sortKey: "status",
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
      accessor: (row) =>
        row.due_date ? new Date(row.due_date).toLocaleDateString() : "-",
      sortable: true,
      sortKey: "due_date",
    },
    {
      id: "amount",
      header: t("totalAmount"),
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
        ...(hasViewPermission || hasDetailPermission
          ? [
              {
                label: t("view"),
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: InvoiceWithStringId) => handleViewInvoice(parseInt(row.id)),
                show: true,
              },
            ]
          : []),
        ...(hasApprovePermission
          ? [
              {
                label: t("setPending"),
                icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
                onClick: (row: InvoiceWithStringId) => handleSetPending(parseInt(row.id)),
                show: (row: InvoiceWithStringId) => row.status === "DRAFT",
                disabled: setPendingInvoice.isPending,
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
        ...(hasDeletePermission
          ? [
              {
                label: t("delete"),
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
                onClick: (row: InvoiceWithStringId) => handleDeleteClick(parseInt(row.id)),
                show: (row: InvoiceWithStringId) => row.status === "DRAFT",
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
              <SelectItem value="PARTIAL">{t("partial")}</SelectItem>
              <SelectItem value="OVERDUE">{t("overdue")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            {hasCreatePermission && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addInvoice")}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
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
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder={t("filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                <SelectItem value="DRAFT">{t("draft")}</SelectItem>
                <SelectItem value="UNPAID">{t("unpaid")}</SelectItem>
                <SelectItem value="PAID">{t("paid")}</SelectItem>
                <SelectItem value="PARTIAL">{t("partial")}</SelectItem>
                <SelectItem value="OVERDUE">{t("overdue")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {hasCreatePermission && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addInvoice")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Data Table or Split View */}
      {viewMode === "table" ? (
        <DataTable
          columns={columns}
          data={invoicesWithStringId}
          isLoading={isLoading}
          pagination={pagination ? {
            page: pagination.page,
            per_page: pagination.limit,
            total: pagination.total,
            total_pages: Math.ceil(pagination.total / pagination.limit),
            has_next: pagination.page < Math.ceil(pagination.total / pagination.limit),
            has_prev: pagination.page > 1,
          } : undefined}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          sortableColumns={sortableColumns}
          sort={sortBy && sortOrder ? { sort_by: sortBy, sort_order: sortOrder } : undefined}
          onSortChange={handleSortChange}
          emptyMessage={t("empty")}
        />
      ) : (
        <SplitViewContainer>
          <SplitViewSidebar
            items={invoices ?? []}
            selectedItemId={selectedSplitInvoiceId}
            onItemClick={handleSplitInvoiceClick}
            renderItem={(invoice) => (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium truncate cursor-pointer text-sm">
                      {invoice.code}
                    </span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">
                    {invoice.invoice_number}
                  </p>
                  {invoice.purchase_order?.code && (
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      PO: {invoice.purchase_order.code}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium">
                      {formatCurrency(invoice.amount ?? 0)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {invoice.invoice_date
                        ? new Date(invoice.invoice_date).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            emptyMessage={t("empty")}
            title={t("title")}
            isOpen={isSplitSidebarOpen}
            onClose={
              isMobile
                ? () => {
                    hasManuallyToggledRef.current = true;
                    setIsSplitSidebarOpen(false);
                  }
                : undefined
            }
          />
          <div className="flex-1">
            {selectedSplitInvoiceId ? (
              <SupplierInvoiceDetailModal
                invoiceId={selectedSplitInvoiceId}
                open={true}
                onOpenChange={(open) => {
                  if (!open) {
                    setSelectedSplitInvoiceId(null);
                    setViewingInvoiceId(null);
                  }
                }}
                embedded={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">{t("selectInvoice")}</p>
              </div>
            )}
          </div>
        </SplitViewContainer>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
          </DialogHeader>
          <SupplierInvoiceForm
            onSubmit={async (data) => {
              await handleCreate(data as CreateSupplierInvoiceFormData);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createInvoice.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingInvoice} onOpenChange={(open) => !open && setEditingInvoice(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          {editingInvoiceData?.data && (
            <SupplierInvoiceForm
              invoice={editingInvoiceData.data}
              onSubmit={handleUpdate}
              onCancel={() => setEditingInvoice(null)}
              isLoading={updateInvoice.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Modal (for table view) */}
      <SupplierInvoiceDetailModal
        invoiceId={modalInvoiceId}
        open={!!modalInvoiceId}
        onOpenChange={(open) => !open && setModalInvoiceId(null)}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingInvoiceId}
        onOpenChange={(open) => !open && setDeletingInvoiceId(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteInvoice.isPending}
        title={t("deleteTitle")}
        description={
          deletingInvoiceId
            ? t("deleteDescriptionWithName", {
                code: invoices.find((i) => i.id === deletingInvoiceId)?.code ?? "",
              })
            : t("deleteDescription")
        }
        itemName={t("deleteItemName")}
      />
    </div>
  );
}




