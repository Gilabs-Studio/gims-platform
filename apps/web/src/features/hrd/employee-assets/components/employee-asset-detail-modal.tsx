"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { AssetCondition, AssetStatus, EmployeeAsset } from "../types";

interface EmployeeAssetDetailModalProps {
  asset: EmployeeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeAssetDetailModal({
  asset,
  open,
  onOpenChange,
}: EmployeeAssetDetailModalProps) {
  const t = useTranslations("employeeAssets");

  if (!asset) return null;

  const getStatusBadge = (status: AssetStatus) => {
    const variants: Record<AssetStatus, "warning" | "default"> = {
      BORROWED: "warning",
      RETURNED: "default",
    };
    return (
      <Badge variant={variants[status]}>{t(`status.${status}`)}</Badge>
    );
  };

  const getConditionBadge = (condition: AssetCondition) => {
    const variants: Record<
      AssetCondition,
      "default" | "secondary" | "destructive"
    > = {
      NEW: "default",
      GOOD: "default",
      FAIR: "secondary",
      POOR: "secondary",
      DAMAGED: "destructive",
    };
    return (
      <Badge variant={variants[condition]}>{t(`condition.${condition}`)}</Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("detail.title")}</DialogTitle>
          <DialogDescription>
            {asset.asset_code} - {asset.asset_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset Information */}
          <div>
            <h3 className="mb-3 font-semibold">{t("detail.assetInfo")}</h3>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("columns.assetCode")}
                </span>
                <span className="text-sm font-medium">{asset.asset_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("columns.assetName")}
                </span>
                <span className="text-sm font-medium">{asset.asset_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("columns.category")}
                </span>
                <span className="text-sm font-medium">{asset.asset_category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("columns.status")}
                </span>
                {getStatusBadge(asset.status)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Borrow Information */}
          <div>
            <h3 className="mb-3 font-semibold">{t("detail.borrowInfo")}</h3>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("columns.employee")}
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {asset.employee?.name ?? "-"}
                  </div>
                  {asset.employee && (
                    <div className="text-xs text-muted-foreground">
                      {asset.employee.employee_code}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("columns.borrowDate")}
                </span>
                <span className="text-sm font-medium">
                  {format(new Date(asset.borrow_date), "dd MMM yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("columns.borrowCondition")}
                </span>
                {getConditionBadge(asset.borrow_condition)}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("detail.daysBorrowedLabel")}
                </span>
                <span className="text-sm font-medium">
                  {t("detail.daysTotal", { days: asset.days_borrowed })}
                </span>
              </div>
            </div>
          </div>

          {/* Return Information */}
          {asset.return_date ? (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">{t("detail.returnInfo")}</h3>
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("columns.returnDate")}
                    </span>
                    <span className="text-sm font-medium">
                      {format(new Date(asset.return_date), "dd MMM yyyy")}
                    </span>
                  </div>
                  {asset.return_condition && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("columns.returnCondition")}
                      </span>
                      {getConditionBadge(asset.return_condition)}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">{t("detail.returnInfo")}</h3>
                <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                  {t("detail.notReturned")}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {asset.notes && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">{t("form.notes")}</h3>
                <div className="rounded-lg border p-4">
                  <p className="whitespace-pre-wrap text-sm">{asset.notes}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
