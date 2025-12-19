"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePurchaseRequisition } from "../hooks/use-purchase-requisitions";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { PurchaseRequisition } from "../types";

interface PurchaseRequisitionDetailProps {
  readonly requisitionId: number | null;
  readonly hideHeader?: boolean;
  readonly className?: string;
}

export function PurchaseRequisitionDetail({
  requisitionId,
  hideHeader = false,
  className,
}: PurchaseRequisitionDetailProps) {
  const { data, isLoading, isError } = usePurchaseRequisition(requisitionId);
  const t = useTranslations("purchaseRequisitions.detail");

  if (!requisitionId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>{t("selectRequisition")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <p>{t("loadError")}</p>
      </div>
    );
  }

  const requisition: PurchaseRequisition = data.data;
  const items = requisition.items ?? [];

  const getStatusBadge = (status: PurchaseRequisition["status"]) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("draft")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("rejected")}
          </Badge>
        );
      case "CONVERTED":
        return (
          <Badge variant="outline">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("converted")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{requisition.code}</h2>
          {getStatusBadge(requisition.status)}
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("basicInfo.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("basicInfo.code")}</p>
              <p className="font-medium">{requisition.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("basicInfo.supplier")}</p>
              <p className="font-medium">{requisition.supplier?.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("basicInfo.businessUnit")}</p>
              <p className="font-medium">{requisition.business_unit?.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("basicInfo.paymentTerms")}</p>
              <p className="font-medium">
                {requisition.payment_terms?.name ?? "-"} ({requisition.payment_terms?.days ?? 0}{" "}
                days)
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("basicInfo.requestDate")}</p>
              <p className="font-medium">
                {requisition.request_date
                  ? new Date(requisition.request_date).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("basicInfo.requestedBy")}</p>
              <p className="font-medium">{requisition.user?.name ?? "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>{t("items.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("items.empty")}</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.product?.name ?? item.product_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.product?.code ?? ""}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatCurrency(item.subtotal ?? 0)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("items.quantity")}</p>
                      <p>{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("items.purchasePrice")}</p>
                      <p>{formatCurrency(item.purchase_price ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("items.discount")}</p>
                      <p>{item.discount ?? 0}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("financial.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <p className="text-muted-foreground">{t("financial.subtotal")}</p>
            <p className="font-medium">{formatCurrency(requisition.subtotal ?? 0)}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-muted-foreground">{t("financial.taxRate")}</p>
            <p>{requisition.tax_rate ?? 0}%</p>
          </div>
          <div className="flex justify-between">
            <p className="text-muted-foreground">{t("financial.taxAmount")}</p>
            <p>{formatCurrency(requisition.tax_amount ?? 0)}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-muted-foreground">{t("financial.deliveryCost")}</p>
            <p>{formatCurrency(requisition.delivery_cost ?? 0)}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-muted-foreground">{t("financial.otherCost")}</p>
            <p>{formatCurrency(requisition.other_cost ?? 0)}</p>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <p className="font-semibold">{t("financial.totalAmount")}</p>
            <p className="font-bold text-lg">
              {formatCurrency(requisition.total_amount ?? 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(requisition.address || requisition.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("notes.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requisition.address && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("notes.address")}</p>
                <p>{requisition.address}</p>
              </div>
            )}
            {requisition.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("notes.notes")}</p>
                <p>{requisition.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>{t("metadata.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {requisition.created_by && (
            <div className="flex justify-between">
              <p className="text-muted-foreground">{t("metadata.createdBy")}</p>
              <p>{requisition.created_by.name}</p>
            </div>
          )}
          <div className="flex justify-between">
            <p className="text-muted-foreground">{t("metadata.createdAt")}</p>
            <p>
              {requisition.created_at
                ? new Date(requisition.created_at).toLocaleString()
                : "-"}
            </p>
          </div>
          <div className="flex justify-between">
            <p className="text-muted-foreground">{t("metadata.updatedAt")}</p>
            <p>
              {requisition.updated_at
                ? new Date(requisition.updated_at).toLocaleString()
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

