"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, FileText, Clock, Send, Info, DollarSign, Package, History, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { QuotationForm } from "./quotation-form";
import {
  useDeleteQuotation,
  useUpdateQuotationStatus,
  useQuotation,
  useQuotationItems,
} from "../hooks/use-quotations";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";
import type { SalesQuotation } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface QuotationDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly quotation: SalesQuotation | null;
}

export function QuotationDetailModal({
  open,
  onClose,
  quotation,
}: QuotationDetailModalProps) {
  const deleteQuotation = useDeleteQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const t = useTranslations("quotation");

  // Fetch full detail WITHOUT items when modal opens
  const { data: detailData, isLoading } = useQuotation(quotation?.id ?? "", {
    enabled: open && !!quotation?.id,
  });

  // Fetch items separately with server-side pagination
  const { data: itemsData, isLoading: itemsLoading } = useQuotationItems(
    quotation?.id ?? "",
    { page: itemsPage, per_page: pageSize },
    { enabled: open && !!quotation?.id }
  );

  const canEdit = useUserPermission("sales_quotation.update");
  const canDelete = useUserPermission("sales_quotation.delete");
  const canApprove = useUserPermission("sales_quotation.approve");
  const canReject = useUserPermission("sales_quotation.reject");
  const canConvert = useUserPermission("sales_quotation.convert");

  if (!quotation) return null;

  // Use detailed data if available, otherwise use passed quotation
  const displayQuotation = detailData?.data ?? quotation;
  
  // Use server-side paginated items
  const items = itemsData?.data ?? [];
  const itemsPagination = itemsData?.meta?.pagination;
  
  // Server pagination values
  const totalItems = itemsPagination?.total ?? 0;
  const totalPages = itemsPagination?.total_pages ?? 0;
  const hasNextPage = itemsPagination?.has_next ?? false;
  const hasPrevPage = itemsPagination?.has_prev ?? false;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.draft")}
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {t("status.rejected")}
          </Badge>
        );
      case "converted":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.converted")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const handleDelete = async () => {
    if (!quotation?.id) return;
    try {
      await deleteQuotation.mutateAsync(quotation.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      console.error("Failed to delete quotation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleApprove = async () => {
    if (!quotation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: quotation.id,
        data: { status: "approved" },
      });
      toast.success(t("status.approved"));
    } catch (error) {
      console.error("Failed to approve quotation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleReject = async () => {
    if (!quotation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: quotation.id,
        data: { status: "rejected" },
      });
      toast.success(t("status.rejected"));
    } catch (error) {
      console.error("Failed to reject quotation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleConvert = async () => {
    if (!quotation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: quotation.id,
        data: { status: "converted" },
      });
      toast.success(t("status.converted"));
    } catch (error) {
      console.error("Failed to convert quotation:", error);
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{displayQuotation?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  {quotation && getStatusBadge(quotation.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayQuotation?.quotation_date && new Date(displayQuotation.quotation_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && quotation?.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="cursor-pointer"
                    title={t("common.edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && quotation?.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {displayQuotation?.status === "sent" && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleApprove}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={t("actions.approve")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {displayQuotation?.status === "sent" && canReject && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReject}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                    title={t("actions.reject")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {displayQuotation?.status === "approved" && canConvert && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleConvert}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title={t("actions.convert")}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-6 py-4">
              <div className="flex gap-6">
                <Skeleton className="h-20 flex-1" />
                <Skeleton className="h-20 flex-1" />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">
                  <Info className="h-4 w-4 mr-2" />
                  {t("tabs.general")}
                </TabsTrigger>
                <TabsTrigger value="items">
                  <Package className="h-4 w-4 mr-2" />
                  {t("tabs.items")}
                </TabsTrigger>
              </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-8 py-6">
              {/* Total Amount Card - Hero Section */}
              <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-background border border-primary/20 shadow-sm">
                <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <div className="relative p-8">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-5 w-5" />
                        <span className="text-sm font-medium uppercase tracking-wide">{t("totalAmount")}</span>
                      </div>
                      <div className="text-4xl font-bold tracking-tight text-primary">
                        {formatCurrency(displayQuotation.total_amount)}
                      </div>
                      {displayQuotation.notes && (
                        <p className="text-sm text-muted-foreground mt-4 max-w-2xl leading-relaxed">
                          {displayQuotation.notes}
                        </p>
                      )}
                    </div>
                    {(displayQuotation.approved_at || displayQuotation.rejected_at || displayQuotation.converted_at) && (
                      <div className="flex flex-col gap-2 bg-background/80 backdrop-blur-sm rounded-xl p-4 border shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          <History className="h-3.5 w-3.5" />
                          {t("common.workflow")}
                        </div>
                        {displayQuotation.approved_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-green-700 dark:text-green-400">{t("status.approved")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayQuotation.approved_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                        {displayQuotation.rejected_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-red-700 dark:text-red-400">{t("status.rejected")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayQuotation.rejected_at).toLocaleString()}
                              </p>
                              {displayQuotation.rejection_reason && (
                                <p className="text-xs mt-1.5 italic text-muted-foreground border-l-2 border-red-300 pl-2">
                                  {displayQuotation.rejection_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {displayQuotation.converted_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <FileText className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-blue-700 dark:text-blue-400">{t("status.converted")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayQuotation.converted_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left Section - Quotation Details & Related Info */}
                <div className="space-y-6">
                  {/* Quotation Information Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {t("common.quotation")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("code")}</p>
                        <p className="text-base font-semibold">{displayQuotation.code}</p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("quotationDate")}</p>
                          <p className="text-sm font-medium">{new Date(displayQuotation.quotation_date).toLocaleDateString()}</p>
                        </div>
                        {displayQuotation.valid_until && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("validUntil")}</p>
                            <p className="text-sm font-medium">{new Date(displayQuotation.valid_until).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Related Information Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        {t("common.related")}
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 gap-5">
                        {displayQuotation.payment_terms && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("paymentTerms")}</p>
                              <p className="text-sm font-medium truncate">{displayQuotation.payment_terms.name}</p>
                            </div>
                          </div>
                        )}
                        {displayQuotation.sales_rep && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <Send className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("salesRep")}</p>
                              <p className="text-sm font-medium truncate">{displayQuotation.sales_rep.name}</p>
                            </div>
                          </div>
                        )}
                        {displayQuotation.business_unit && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("businessUnit")}</p>
                              <p className="text-sm font-medium truncate">{displayQuotation.business_unit.name}</p>
                            </div>
                          </div>
                        )}
                        {displayQuotation.business_type && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("businessType")}</p>
                              <p className="text-sm font-medium truncate">{displayQuotation.business_type.name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Information Card */}
                  {(displayQuotation.customer_name || displayQuotation.customer_contact || displayQuotation.customer_phone || displayQuotation.customer_email) && (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                      <div className="bg-muted/50 px-6 py-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          {t("customerInfo")}
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 gap-5">
                          {displayQuotation.customer_name && (
                            <div className="flex items-start gap-3 group">
                              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">{t("customerName")}</p>
                                <p className="text-sm font-medium truncate">{displayQuotation.customer_name}</p>
                              </div>
                            </div>
                          )}
                          {displayQuotation.customer_contact && (
                            <div className="flex items-start gap-3 group">
                              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">{t("customerContact")}</p>
                                <p className="text-sm font-medium truncate">{displayQuotation.customer_contact}</p>
                              </div>
                            </div>
                          )}
                          {displayQuotation.customer_phone && (
                            <div className="flex items-start gap-3 group">
                              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <Phone className="h-4 w-4 text-primary" />
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">{t("customerPhone")}</p>
                                <p className="text-sm font-medium truncate">{displayQuotation.customer_phone}</p>
                              </div>
                            </div>
                          )}
                          {displayQuotation.customer_email && (
                            <div className="flex items-start gap-3 group">
                              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <Mail className="h-4 w-4 text-primary" />
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">{t("customerEmail")}</p>
                                <p className="text-sm font-medium truncate">{displayQuotation.customer_email}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Section - Financial Breakdown */}
                <div className="space-y-6">
                  {/* Financial Summary Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        {t("common.financial")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Subtotal */}
                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">{t("subtotal")}</span>
                        <span className="text-base font-semibold">{formatCurrency(displayQuotation.subtotal)}</span>
                      </div>

                      {/* Discount */}
                      {displayQuotation.discount_amount > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("discountAmount")}</span>
                          <span className="text-base font-semibold text-destructive">
                            -{formatCurrency(displayQuotation.discount_amount)}
                          </span>
                        </div>
                      )}

                      {/* Tax */}
                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("taxAmount")} ({displayQuotation.tax_rate}%)
                        </span>
                        <span className="text-base font-semibold">{formatCurrency(displayQuotation.tax_amount)}</span>
                      </div>

                      {/* Delivery Cost */}
                      {displayQuotation.delivery_cost > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("deliveryCost")}</span>
                          <span className="text-base font-semibold">{formatCurrency(displayQuotation.delivery_cost)}</span>
                        </div>
                      )}

                      {/* Other Cost */}
                      {displayQuotation.other_cost > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("otherCost")}</span>
                          <span className="text-base font-semibold">{formatCurrency(displayQuotation.other_cost)}</span>
                        </div>
                      )}

                      {/* Total - Highlighted */}
                      <div className="flex items-center justify-between py-4 px-4 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                        <span className="text-base font-bold text-primary">{t("totalAmount")}</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(displayQuotation.total_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Cost Info Card */}
                  {(displayQuotation.delivery_cost > 0 || displayQuotation.other_cost > 0 || displayQuotation.discount_amount > 0) && (
                    <div className="bg-muted/30 rounded-xl border border-dashed p-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-background">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium">Cost Breakdown</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Total includes {displayQuotation.discount_amount > 0 && 'discount, '}
                            {displayQuotation.delivery_cost > 0 && 'delivery cost, '}
                            {displayQuotation.other_cost > 0 && 'additional costs, '}
                            and applicable taxes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4 py-4">
              {itemsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("item.product")}</TableHead>
                          <TableHead className="text-right">{t("item.quantity")}</TableHead>
                          <TableHead className="text-right">{t("item.price")}</TableHead>
                          <TableHead className="text-right">{t("item.discount")}</TableHead>
                          <TableHead className="text-right">{t("item.subtotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>{t("noItems")}</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.product?.name ?? t("unknownProduct")}</p>
                                  {item.product?.code && (
                                    <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.discount ?? 0)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.subtotal)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {totalItems > 0 && (
                    <div className="mt-4">
                      <DataTablePagination
                        pageIndex={itemsPage}
                        pageSize={pageSize}
                        rowCount={totalItems}
                        onPageChange={setItemsPage}
                        onPageSizeChange={(newSize) => {
                          setPageSize(newSize);
                          setItemsPage(1);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {quotation && (
        <QuotationForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          quotation={quotation}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteQuotation.isPending}
      />
    </>
  );
}
