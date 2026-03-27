"use client";

import { useMemo, useState } from "react";
import { Edit, CheckCircle2, XCircle, FileText, Clock, Send, Printer, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/routing";
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
import { useQuotationDetail } from "../hooks/use-quotation-detail";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import { QuotationProductDetailModal } from "./quotation-product-detail-modal";
import { QuotationForm } from "./quotation-form";
import {
  useDeleteQuotation,
  useUpdateQuotationStatus,
  useQuotation,
  useQuotationItems,
  useQuotationAuditTrail,
} from "../hooks/use-quotations";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import type { SalesQuotation } from "../types";
import { QuotationPrintDialog } from "./quotation-print-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { AuditTrailTable, buildFallbackAuditTrailEntries } from "@/components/ui/audit-trail-table";

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
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState<"general" | "items" | "audit-trail">("general");
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const t = useTranslations("quotation");

  const { data: detailData, isLoading } = useQuotation(quotation?.id ?? "", {
    enabled: open && !!quotation?.id,
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuotationItems(
    quotation?.id ?? "",
    { page: itemsPage, per_page: pageSize },
    { enabled: open && !!quotation?.id && activeTab === "items" }
  );

  const { data: auditData, isFetching: auditLoading, isError: auditError } = useQuotationAuditTrail(
    quotation?.id ?? "",
    { page: auditPage, per_page: auditPageSize },
    { enabled: open && !!quotation?.id && activeTab === "audit-trail" }
  );

  const canEdit = useUserPermission("sales_quotation.update");
  const canDelete = useUserPermission("sales_quotation.delete");
  const canApprove = useUserPermission("sales_quotation.approve");
  const canReject = useUserPermission("sales_quotation.reject");
  const canConvert = useUserPermission("sales_quotation.convert");
  const canPrint = useUserPermission("sales_quotation.print");
  const canViewCustomer = useUserPermission("customer.read");

  const {
    canViewEmployee,
    canViewProduct,
    isEmployeeOpen,
    setIsEmployeeOpen,
    selectedEmployee,
    isProductOpen,
    setIsProductOpen,
    selectedProductId,
    openEmployee,
    openProduct,
  } = useQuotationDetail();

  const displayQuotation = detailData?.data ?? quotation;
  const fallbackAuditEntries = useMemo(
    () => {
      if (!displayQuotation) return [];

      return buildFallbackAuditTrailEntries([
        {
          id: `${displayQuotation.id}-created`,
          action: "sales_quotation.create",
          at: displayQuotation.created_at,
          user: displayQuotation.created_by,
          metadata: {
            details: `Created quotation with total ${formatCurrency(displayQuotation.total_amount ?? 0)}`,
          },
        },
        {
          id: `${displayQuotation.id}-updated`,
          action: "sales_quotation.update",
          at: displayQuotation.updated_at,
          metadata:
            displayQuotation.updated_at && displayQuotation.updated_at !== displayQuotation.created_at
              ? { details: "Quotation data updated" }
              : null,
        },
        {
          id: `${displayQuotation.id}-approved`,
          action: "sales_quotation.approve",
          at: displayQuotation.approved_at,
          user: displayQuotation.approved_by,
          metadata: {
            status: "approved",
          },
        },
        {
          id: `${displayQuotation.id}-rejected`,
          action: "sales_quotation.reject",
          at: displayQuotation.rejected_at,
          user: displayQuotation.rejected_by,
          metadata: {
            status: "rejected",
            details: displayQuotation.rejection_reason ?? "Quotation rejected",
          },
        },
        {
          id: `${displayQuotation.id}-converted`,
          action: "sales_quotation.convert",
          at: displayQuotation.converted_at,
          metadata: {
            status: "converted",
          },
        },
      ]);
    },
    [displayQuotation],
  );
  const useServerAudit = (auditData?.data?.length ?? 0) > 0;
  const auditEntries = useServerAudit ? auditData?.data ?? [] : fallbackAuditEntries;
  const auditPagination = useServerAudit ? auditData?.meta?.pagination : undefined;
  const items = itemsData?.data ?? [];
  const itemsPagination = itemsData?.meta?.pagination;

  const totalItems = itemsPagination?.total ?? 0;

  if (!quotation || !displayQuotation) return null;

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
            <Badge variant="info" className="text-xs font-medium">
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

  const handleSubmit = async () => {
    if (!quotation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: quotation.id,
        data: { status: "sent" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to submit quotation:", error);
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
    }catch (error) {
      console.error("Failed to convert quotation:", error);
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setActiveTab("general");
          }
          onClose();
        }}
      >
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{displayQuotation?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {displayQuotation?.quotation_date && formatDate(displayQuotation.quotation_date)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canPrint && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPrintDialogOpen(true)}
                    className="cursor-pointer text-purple hover:text-purple hover:bg-purple/10"
                    title={t("print")}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )}
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
                {canEdit && quotation?.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSubmit}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.submit")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {displayQuotation?.status === "sent" && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleApprove}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
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
                    className="cursor-pointer text-destructive hover:text-destructive hover:bg-red-50"
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
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.convert")}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value === "items" || value === "audit-trail" ? value : "general")
              }
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
                <TabsTrigger value="audit-trail">{t("tabs.auditTrail")}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6 py-4">

                {/* Main Information Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("code")}</TableCell>
                        <TableCell>{displayQuotation.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("quotationDate")}</TableCell>
                        <TableCell>{displayQuotation.quotation_date ? formatDate(displayQuotation.quotation_date) : "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>{getStatusBadge(displayQuotation.status)}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("validUntil")}</TableCell>
                        <TableCell>{displayQuotation.valid_until ? formatDate(displayQuotation.valid_until) : "-"}</TableCell>
                      </TableRow>
                      {displayQuotation.payment_terms && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("paymentTerms")}</TableCell>
                          <TableCell>{displayQuotation.payment_terms.name}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("salesRep")}</TableCell>
                          <TableCell>
                            {displayQuotation.sales_rep ? (
                              canViewEmployee ? (
                                <button
                                  onClick={() => openEmployee(displayQuotation.sales_rep)}
                                  className="text-primary hover:underline cursor-pointer text-left"
                                >
                                  {displayQuotation.sales_rep.name}
                                </button>
                              ) : (
                                <span>{displayQuotation.sales_rep.name}</span>
                              )
                            ) : (
                              <span>-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      {displayQuotation.business_unit && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("businessUnit")}</TableCell>
                          <TableCell>{displayQuotation.business_unit.name}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("businessType")}</TableCell>
                          <TableCell>{displayQuotation.business_type?.name ?? "-"}</TableCell>
                        </TableRow>
                      )}
                      {displayQuotation.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("notes")}</TableCell>
                          <TableCell colSpan={3}>{displayQuotation.notes}</TableCell>
                        </TableRow>
                      )}
                      {displayQuotation.source_deal_id && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("sourceDeal")}</TableCell>
                          <TableCell colSpan={3}>
                            <Link
                              href={`/crm/pipeline/${displayQuotation.source_deal_id}`}
                              className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {t("sourceDeal")}
                            </Link>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Customer Information Table */}
                {(displayQuotation.customer_id || displayQuotation.customer?.name || displayQuotation.customer_name || displayQuotation.customer_contact) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("customerInfo")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("common.customer")}</TableCell>
                              <TableCell>
                                {canViewCustomer && displayQuotation.customer_id ? (
                                  <button
                                    onClick={() => {
                                      setSelectedCustomerId(displayQuotation.customer_id ?? null);
                                      setIsCustomerOpen(true);
                                    }}
                                    className="text-primary hover:underline cursor-pointer text-left"
                                  >
                                    {displayQuotation.customer?.name ?? displayQuotation.customer_name ?? displayQuotation.customer_id}
                                  </button>
                                ) : (
                                  <span>{displayQuotation.customer?.name ?? displayQuotation.customer_name ?? "-"}</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerContact")}</TableCell>
                              <TableCell>{displayQuotation.customer_contact ?? "-"}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerEmail")}</TableCell>
                              <TableCell>{displayQuotation.customer_contact_ref?.email ?? displayQuotation.customer_email ?? "-"}</TableCell>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerPhone")}</TableCell>
                              <TableCell>{displayQuotation.customer_contact_ref?.phone ?? displayQuotation.customer_phone ?? "-"}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                {/* Financial Summary Table */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("common.financial")}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("subtotal")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(displayQuotation.subtotal)}</TableCell>
                        </TableRow>
                        {displayQuotation.discount_amount > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("discountAmount")}</TableCell>
                            <TableCell className="text-right text-destructive">-{formatCurrency(displayQuotation.discount_amount)}</TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("taxAmount")} ({displayQuotation.tax_rate}%)</TableCell>
                          <TableCell className="text-right">{formatCurrency(displayQuotation.tax_amount)}</TableCell>
                        </TableRow>
                        {displayQuotation.delivery_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("deliveryCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(displayQuotation.delivery_cost)}</TableCell>
                          </TableRow>
                        )}
                        {displayQuotation.other_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("otherCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(displayQuotation.other_cost)}</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold bg-muted">{t("totalAmount")}</TableCell>
                          <TableCell className="text-right font-bold text-lg">{formatCurrency(displayQuotation.total_amount)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Workflow History */}
                {(displayQuotation.approved_at || displayQuotation.rejected_at || displayQuotation.converted_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {displayQuotation.approved_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("status.approved")}</TableCell>
                                <TableCell>{new Date(displayQuotation.approved_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {displayQuotation.rejected_at && (
                              <>
                                <TableRow>
                                  <TableCell className="font-medium bg-muted/50">{t("status.rejected")}</TableCell>
                                  <TableCell>{new Date(displayQuotation.rejected_at).toLocaleString()}</TableCell>
                                </TableRow>
                                {displayQuotation.rejection_reason && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50">{t("rejectionReason")}</TableCell>
                                    <TableCell>{displayQuotation.rejection_reason}</TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                            {displayQuotation.converted_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.converted")}</TableCell>
                                <TableCell>{new Date(displayQuotation.converted_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="items" className="space-y-4 py-4">
                {itemsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border">
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
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {t("noItems")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  {item.product && canViewProduct ? (
                                    <button
                                      onClick={() => openProduct(item.product?.id)}
                                      className="text-primary hover:underline cursor-pointer text-left"
                                    >
                                      <p className="font-medium">{item.product.name}</p>
                                      {item.product.code && (
                                        <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                      )}
                                    </button>
                                  ) : (
                                    <div>
                                      <p className="font-medium">{item.product?.name ?? t("unknownProduct")}</p>
                                      {item.product?.code && (
                                        <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.discount ?? 0)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {totalItems > 0 && (
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
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="audit-trail" className="py-4">
                <AuditTrailTable
                  entries={auditEntries}
                  isLoading={auditLoading && auditEntries.length === 0}
                  errorText={auditError && auditEntries.length === 0 ? t("common.error") : undefined}
                  pagination={auditPagination}
                  onPageChange={useServerAudit ? setAuditPage : undefined}
                  onPageSizeChange={
                    useServerAudit
                      ? (newSize) => {
                          setAuditPageSize(newSize);
                          setAuditPage(1);
                        }
                      : undefined
                  }
                  labels={{
                    empty: t("auditTrail.empty"),
                    columns: {
                      action: t("auditTrail.columns.action"),
                      user: t("auditTrail.columns.user"),
                      time: t("auditTrail.columns.time"),
                      details: t("auditTrail.columns.details"),
                    },
                  }}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <EmployeeDetailModal
        open={isEmployeeOpen}
        onOpenChange={setIsEmployeeOpen}
        employee={selectedEmployee as unknown as MdEmployee}
      />

      <CustomerDetailModal
        open={isCustomerOpen}
        onOpenChange={setIsCustomerOpen}
        customerId={selectedCustomerId}
      />

      <QuotationProductDetailModal
        open={isProductOpen}
        onOpenChange={setIsProductOpen}
        productId={selectedProductId}
      />

      {quotation && (
        <QuotationForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          quotation={quotation}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          isLoading={deleteQuotation.isPending}
        />
      )}

      {quotation?.id && (
        <QuotationPrintDialog
          open={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
          quotationId={quotation.id}
        />
      )}
    </>
  );
}
