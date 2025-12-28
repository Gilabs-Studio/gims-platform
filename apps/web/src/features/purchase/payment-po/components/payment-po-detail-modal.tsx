"use client";

import {
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
  CreditCard,
  DollarSign,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContents } from "@/components/ui/tabs";
import { PaymentPOForm } from "./payment-po-form";
import { PaymentPODetailTabs } from "./payment-po-detail-tabs";
import {
  usePaymentPO,
  useDeletePaymentPO,
  useUpdatePaymentPO,
  useConfirmPaymentPO,
} from "../hooks/use-payment-pos";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useHasPermission } from "../hooks/use-has-permission";
import { formatCurrency } from "@/lib/utils";
import type { UpdatePaymentPOFormData } from "../schemas/payment-po.schema";
import type { PaymentPO } from "../types";

interface PaymentPODetailModalProps {
  readonly paymentPOId: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onPaymentPOUpdated?: () => void;
  readonly embedded?: boolean; // For split view without dialog overlay
}

export function PaymentPODetailModal({
  paymentPOId,
  open,
  onOpenChange,
  onPaymentPOUpdated,
  embedded = false,
}: PaymentPODetailModalProps) {
  const { data, isLoading, error } = usePaymentPO(paymentPOId);
  const deletePaymentPO = useDeletePaymentPO();
  const updatePaymentPO = useUpdatePaymentPO();
  const confirmPaymentPO = useConfirmPaymentPO();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("paymentPO.detailModal");
  const tDetail = useTranslations("paymentPO.detail");
  const tList = useTranslations("paymentPO.list");

  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const paymentPO: PaymentPO | undefined = data?.data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {tDetail("pending")}
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="default" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {tDetail("confirmed")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "CASH":
        return (
          <Badge variant="outline" className="text-xs">
            {tDetail("cash")}
          </Badge>
        );
      case "BANK":
        return (
          <Badge variant="outline" className="text-xs">
            <CreditCard className="h-3 w-3 mr-1.5" />
            {tDetail("bank")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!paymentPO || !paymentPOId) return;
    try {
      await deletePaymentPO.mutateAsync(paymentPOId);
      toast.success(t("toastDeleted"));
      onOpenChange(false);
      onPaymentPOUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleConfirm = async () => {
    if (!paymentPO || !paymentPOId) return;
    try {
      await confirmPaymentPO.mutateAsync(paymentPOId);
      toast.success(t("toastConfirmed"));
      onPaymentPOUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const renderContent = () => (
    <>
      {embedded && (
        <div className="flex items-center justify-between pb-4">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
      )}
      {!embedded && (
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
        </DialogHeader>
      )}

      {isLoading && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      )}

      {error && (
        <div className="text-center text-muted-foreground py-12">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">{tDetail("loadError")}</p>
        </div>
      )}

      {!isLoading && !error && paymentPO && (
        <div className="space-y-6">
          {/* Enhanced Header Section */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b">
            <div className="flex items-start gap-4 flex-1">
              <div className="h-20 w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                <CreditCard className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold tracking-tight mb-2">#{paymentPO.id}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(paymentPO.status)}
                  {getMethodBadge(paymentPO.method)}
                  {paymentPO.invoice?.purchase_order && (
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1.5" />
                      {paymentPO.invoice.purchase_order.code}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasApprovePermission && paymentPO.status === "PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={confirmPaymentPO.isPending}
                  className="gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {confirmPaymentPO.isPending ? t("confirming") : tList("confirm")}
                </Button>
              )}
              {hasEditPermission && paymentPO.status === "PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                  {t("edit")}
                </Button>
              )}
              {hasDeletePermission && paymentPO.status === "PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2 text-destructive hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("delete")}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {tDetail("invoice")}
                    </p>
                    <p className="text-sm font-medium truncate">
                      {paymentPO.invoice?.invoice_number ?? "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {tDetail("bankAccount")}
                    </p>
                    <p className="text-sm font-medium truncate">
                      {paymentPO.bank_account?.name ?? "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {tDetail("amount")}
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(paymentPO.amount ?? 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Organized Information - Lazy Loaded */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview" className="gap-2">
                <FileText className="h-4 w-4" />
                {tDetail("basicInfo.title")}
              </TabsTrigger>
              {paymentPO.allocations && paymentPO.allocations.length > 0 && (
                <TabsTrigger value="allocations" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  {tDetail("allocations")} ({paymentPO.allocations.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="metadata" className="gap-2">
                <Calendar className="h-4 w-4" />
                {tDetail("metadata.title")}
              </TabsTrigger>
            </TabsList>

            <TabsContents className="mt-6">
              <PaymentPODetailTabs paymentPO={paymentPO} />
            </TabsContents>
          </Tabs>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="h-full overflow-y-auto p-6">{renderContent()}</div>
        {/* Edit Dialog */}
        {isEditDialogOpen && paymentPO && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("editDialogTitle")}</DialogTitle>
              </DialogHeader>
              <PaymentPOForm
                paymentPO={paymentPO}
                onSubmit={async (formData) => {
                  try {
                    await updatePaymentPO.mutateAsync({
                      id: paymentPOId!,
                      data: formData as UpdatePaymentPOFormData,
                    });
                    setIsEditDialogOpen(false);
                    toast.success(t("toastUpdated"));
                    onPaymentPOUpdated?.();
                  } catch {
                    // Error already handled in api-client interceptor
                  }
                }}
                onCancel={() => setIsEditDialogOpen(false)}
                isLoading={updatePaymentPO.isPending}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Dialog */}
        <DeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title={t("deleteDialogTitle")}
          description={
            paymentPO
              ? t("deleteDialogDescriptionWithName", { id: paymentPO.id })
              : t("deleteDialogDescription")
          }
          itemName={t("deleteDialogItemName")}
          isLoading={deletePaymentPO.isPending}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {isEditDialogOpen && paymentPO && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <PaymentPOForm
              paymentPO={paymentPO}
              onSubmit={async (formData) => {
                try {
                  await updatePaymentPO.mutateAsync({
                    id: paymentPOId!,
                    data: formData as UpdatePaymentPOFormData,
                  });
                  setIsEditDialogOpen(false);
                  toast.success(t("toastUpdated"));
                  onPaymentPOUpdated?.();
                } catch {
                  // Error already handled in api-client interceptor
                }
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updatePaymentPO.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={t("deleteDialogTitle")}
        description={
          paymentPO
            ? t("deleteDialogDescriptionWithName", { id: paymentPO.id })
            : t("deleteDialogDescription")
        }
        itemName={t("deleteDialogItemName")}
        isLoading={deletePaymentPO.isPending}
      />
    </>
  );
}
