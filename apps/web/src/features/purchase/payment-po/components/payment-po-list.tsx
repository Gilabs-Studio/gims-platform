"use client";

import { useState, useEffect, useRef, startTransition, useMemo, useCallback, memo } from "react";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  Table,
  LayoutGrid,
  CreditCard,
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
import { PaymentPODetailModal } from "./payment-po-detail-modal";
import { PaymentPOForm } from "./payment-po-form";
import { usePaymentPOList } from "../hooks/use-payment-po-list";
import { useHasPermission } from "../hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PaymentPO } from "../types";
import { useTranslations } from "next-intl";
import type {
  CreatePaymentPOFormData,
  UpdatePaymentPOFormData,
} from "../schemas/payment-po.schema";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Memoized sidebar item component
const PaymentPOSidebarItem = memo(({ 
  paymentPO, 
  getStatusBadge,
  getMethodBadge,
}: { 
  paymentPO: PaymentPO; 
  getStatusBadge: (status: PaymentPO["status"]) => React.ReactNode;
  getMethodBadge: (method: PaymentPO["method"]) => React.ReactNode;
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium truncate cursor-pointer text-sm">
            #{paymentPO.id}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mb-2">
          {paymentPO.invoice?.invoice_number ?? "-"}
        </p>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {getStatusBadge(paymentPO.status)}
          {getMethodBadge(paymentPO.method)}
          <span className="text-xs text-muted-foreground">
            {formatCurrency(paymentPO.amount ?? 0)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {paymentPO.bank_account?.name ?? "-"}
        </p>
      </div>
    </div>
  );
}, (prev, next) => 
  prev.paymentPO.id === next.paymentPO.id &&
  prev.paymentPO.status === next.paymentPO.status &&
  prev.paymentPO.method === next.paymentPO.method &&
  prev.paymentPO.amount === next.paymentPO.amount &&
  prev.paymentPO.invoice?.invoice_number === next.paymentPO.invoice?.invoice_number &&
  prev.paymentPO.bank_account?.name === next.paymentPO.bank_account?.name
);
PaymentPOSidebarItem.displayName = "PaymentPOSidebarItem";

export function PaymentPOList() {
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
    editingPaymentPO,
    setEditingPaymentPO,
    paymentPOs,
    pagination,
    editingPaymentPOData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleConfirm,
    deletingPaymentPOId,
    setDeletingPaymentPOId,
    handleSortChange,
    deletePaymentPO,
    createPaymentPO,
    updatePaymentPO,
    confirmPaymentPO,
  } = usePaymentPOList();

  const [viewingPaymentPOId, setViewingPaymentPOId] = useState<number | null>(null);
  const [modalPaymentPOId, setModalPaymentPOId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "split">("split");
  const [selectedSplitPaymentPOId, setSelectedSplitPaymentPOId] = useState<number | null>(null);
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

  const t = useTranslations("paymentPO.list");

  // Permission checks
  const hasViewPermission = useHasPermission("VIEW");
  const hasCreatePermission = useHasPermission("CREATE");
  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const handleViewPaymentPO = useCallback((paymentPOId: number) => {
    setModalPaymentPOId(paymentPOId);
  }, []);

  const handleSplitPaymentPOClick = useCallback((paymentPO: PaymentPO) => {
    setSelectedSplitPaymentPOId(paymentPO.id);
    setViewingPaymentPOId(paymentPO.id);
  }, []);

  const getStatusBadge = useCallback((status: PaymentPO["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("pending")}
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("confirmed")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  }, [t]);

  const getMethodBadge = useCallback((method: PaymentPO["method"]) => {
    switch (method) {
      case "CASH":
        return (
          <Badge variant="outline" className="text-xs">
            {t("cash")}
          </Badge>
        );
      case "BANK":
        return (
          <Badge variant="outline" className="text-xs">
            <CreditCard className="h-3 w-3 mr-1" />
            {t("bank")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  }, [t]);

  // Map paymentPOs to have string id for DataTable compatibility - Memoized
  const paymentPOsWithStringId = useMemo(
    () => paymentPOs.map((r) => ({ ...r, id: r.id.toString() })),
    [paymentPOs]
  );
  type PaymentPOWithStringId = Omit<PaymentPO, "id"> & { id: string };

  // Memoize renderItem callback - MUST be outside JSX to follow Rules of Hooks
  const renderSidebarItem = useCallback((paymentPO: PaymentPO) => (
    <PaymentPOSidebarItem 
      paymentPO={paymentPO} 
      getStatusBadge={getStatusBadge}
      getMethodBadge={getMethodBadge}
    />
  ), [getStatusBadge, getMethodBadge]);

  // Memoize columns definition
  const columns: Column<PaymentPOWithStringId>[] = useMemo(() => [
    {
      id: "id",
      header: t("id"),
      accessor: (row) => (
        <button
          onClick={() => handleViewPaymentPO(parseInt(row.id))}
          className="flex items-center gap-3 font-medium text-primary hover:underline cursor-pointer"
        >
          #{row.id}
        </button>
      ),
      sortable: true,
      sortKey: "id",
    },
    {
      id: "invoice",
      header: t("invoice"),
      accessor: (row) => row.invoice?.invoice_number ?? "-",
    },
    {
      id: "bank_account",
      header: t("bankAccount"),
      accessor: (row) => row.bank_account?.name ?? "-",
    },
    {
      id: "payment_date",
      header: t("paymentDate"),
      accessor: (row) =>
        row.payment_date ? new Date(row.payment_date).toLocaleDateString() : "-",
      sortable: true,
      sortKey: "payment_date",
    },
    {
      id: "method",
      header: t("method"),
      accessor: (row) => getMethodBadge(row.method),
    },
    {
      id: "amount",
      header: t("amount"),
      accessor: (row) => formatCurrency(row.amount ?? 0),
      sortable: true,
      sortKey: "amount",
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => getStatusBadge(row.status),
      sortable: true,
      sortKey: "status",
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
                onClick: (row: PaymentPOWithStringId) => handleViewPaymentPO(parseInt(row.id)),
                show: true,
              },
            ]
          : []),
        ...(hasEditPermission
          ? [
              {
                label: t("edit"),
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: PaymentPOWithStringId) => setEditingPaymentPO(parseInt(row.id)),
                show: (row: PaymentPOWithStringId) => row.status === "PENDING",
              },
            ]
          : []),
        ...(hasApprovePermission
          ? [
              {
                label: t("confirm"),
                icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
                onClick: (row: PaymentPOWithStringId) => handleConfirm(parseInt(row.id)),
                show: (row: PaymentPOWithStringId) => row.status === "PENDING",
                disabled: confirmPaymentPO.isPending,
              },
            ]
          : []),
        // Hidden in dropdown menu
        ...(hasDeletePermission
          ? [
              {
                label: t("delete"),
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
                onClick: (row: PaymentPOWithStringId) => handleDeleteClick(parseInt(row.id)),
                show: false,
                variant: "destructive" as const,
              },
            ]
          : []),
      ],
    },
  ], [t, handleViewPaymentPO, getStatusBadge, getMethodBadge, hasViewPermission, hasApprovePermission, hasEditPermission, hasDeletePermission, handleConfirm, confirmPaymentPO.isPending, setEditingPaymentPO, handleDeleteClick]);

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
              <SelectItem value="PENDING">{t("pending")}</SelectItem>
              <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
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
              <span className="truncate">{t("addPayment")}</span>
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
                <SelectItem value="PENDING">{t("pending")}</SelectItem>
                <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
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
                    <span className="hidden xl:inline ml-2">{t("addPayment")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addPayment")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Split View - Sidebar + Detail */}
      {viewMode === "split" && (
        <SplitViewContainer>
          <SplitViewSidebar
            items={paymentPOs}
            selectedItemId={selectedSplitPaymentPOId}
            onItemClick={handleSplitPaymentPOClick}
            renderItem={renderSidebarItem}
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
                  <SelectItem value="PENDING">{t("pending")}</SelectItem>
                  <SelectItem value="CONFIRMED">{t("confirmed")}</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <div className="flex-1 min-w-0 overflow-hidden">
            {viewingPaymentPOId ? (
              <PaymentPODetailModal
                paymentPOId={viewingPaymentPOId}
                open={!!viewingPaymentPOId}
                onOpenChange={(open) => {
                  if (!open) {
                    setViewingPaymentPOId(null);
                    setSelectedSplitPaymentPOId(null);
                  }
                }}
                onPaymentPOUpdated={() => {
                  // List will automatically refresh via query invalidation
                }}
                embedded={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t("selectPayment")}</p>
              </div>
            )}
          </div>
        </SplitViewContainer>
      )}

      {/* Detail Modal (for table view) */}
      <PaymentPODetailModal
        paymentPOId={modalPaymentPOId}
        open={!!modalPaymentPOId}
        onOpenChange={(open) => {
          if (!open) {
            setModalPaymentPOId(null);
          }
        }}
        onPaymentPOUpdated={() => {
          // List will automatically refresh via query invalidation
        }}
      />

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={paymentPOsWithStringId}
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
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
          </DialogHeader>
          <PaymentPOForm
            onSubmit={async (data) => {
              await handleCreate(data as CreatePaymentPOFormData);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createPaymentPO.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingPaymentPO && editingPaymentPOData?.data && (
        <Dialog
          open={!!editingPaymentPO}
          onOpenChange={(open) => !open && setEditingPaymentPO(null)}
        >
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
            </DialogHeader>
            <PaymentPOForm
              paymentPO={editingPaymentPOData.data}
              onSubmit={async (data) => {
                await handleUpdate(data as UpdatePaymentPOFormData);
              }}
              onCancel={() => setEditingPaymentPO(null)}
              isLoading={updatePaymentPO.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingPaymentPOId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPaymentPOId(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={t("deleteTitle")}
        description={
          deletingPaymentPOId
            ? t("deleteDescriptionWithName", {
                id: deletingPaymentPOId,
              })
            : t("deleteDescription")
        }
        itemName="payment PO"
        isLoading={deletePaymentPO.isPending}
      />
    </div>
  );
}
