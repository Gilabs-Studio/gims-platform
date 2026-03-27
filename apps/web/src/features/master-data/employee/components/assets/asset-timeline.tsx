"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  CheckCircle,
  Clock,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  ZoomIn,
} from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import type { EmployeeAsset, AssetStatus } from "../../types";

interface AssetTimelineProps {
  readonly assets: EmployeeAsset[];
  readonly onAdd?: () => void;
  readonly onEdit?: (asset: EmployeeAsset) => void;
  readonly onReturn?: (asset: EmployeeAsset) => void;
  readonly onDelete?: (asset: EmployeeAsset) => void;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
}

function getStatusColor(status: AssetStatus) {
  switch (status) {
    case "BORROWED":
      return "bg-primary";
    case "RETURNED":
      return "bg-success";
  }
}

function StatusIcon({ status }: { readonly status: AssetStatus }) {
  switch (status) {
    case "BORROWED":
      return <Clock className="h-5 w-5 text-white" />;
    case "RETURNED":
      return <CheckCircle className="h-5 w-5 text-white" />;
  }
}

function StatusBadge({
  status,
  t,
}: {
  readonly status: AssetStatus;
  readonly t: ReturnType<typeof useTranslations>;
}) {
  const badgeMap: Record<AssetStatus, { className: string; key: string }> = {
    BORROWED: {
      className: "bg-primary/15 text-primary border-blue-500/20",
      key: "asset.statuses.BORROWED",
    },
    RETURNED: {
      className: "bg-success/15 text-success border-emerald-500/20",
      key: "asset.statuses.RETURNED",
    },
  };

  const config = badgeMap[status];
  return (
    <Badge className={config.className}>
      {t(config.key as Parameters<typeof t>[0])}
    </Badge>
  );
}

function ConditionBadge({
  condition,
  t,
}: {
  readonly condition: string;
  readonly t: ReturnType<typeof useTranslations>;
}) {
  const key = `asset.conditions.${condition}` as Parameters<typeof t>[0];
  return (
    <Badge variant="outline" className="text-xs">
      {t(key)}
    </Badge>
  );
}

export function AssetTimeline({
  assets,
  onAdd,
  onEdit,
  onReturn,
  onDelete,
  canEdit = false,
  canDelete = false,
}: AssetTimelineProps) {
  const t = useTranslations("employee");
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP");
  };

  const sorted = [...assets].sort(
    (a, b) =>
      new Date(b.borrow_date).getTime() - new Date(a.borrow_date).getTime(),
  );

  return (
    <div>
      {onAdd && canEdit && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={onAdd} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1" />
            {t("asset.actions.create")}
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("asset.empty.noAssets")}</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {sorted.map((asset) => (
              <div key={asset.id} className="relative flex gap-4">
                <div
                  className={`relative z-10 shrink-0 w-12 h-12 rounded-full ${getStatusColor(
                    asset.status,
                  )} flex items-center justify-center shadow-md`}
                >
                  <StatusIcon status={asset.status} />
                </div>

                <div className="flex-1 pb-6">
                  <div className="bg-card border rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h4 className="font-semibold text-base">
                          {asset.asset_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {asset.asset_code} &middot; {asset.asset_category}
                        </p>
                      </div>
                      <StatusBadge status={asset.status} t={t} />
                    </div>

                    {asset.asset_image && (
                      <div className="mb-3">
                        <button
                          type="button"
                          className="relative group w-24 h-24 rounded-lg overflow-hidden border bg-muted cursor-pointer"
                          onClick={() =>
                            setPreviewImage({
                              src: resolveImageUrl(asset.asset_image) ?? "",
                              alt: asset.asset_name,
                            })
                          }
                        >
                          <img
                            src={resolveImageUrl(asset.asset_image) ?? ""}
                            alt={asset.asset_name}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement?.classList.add(
                                "flex",
                                "items-center",
                                "justify-center",
                              );
                              const icon = document.createElement("div");
                              icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                              target.parentElement?.appendChild(icon);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {t("asset.fields.borrowDate")}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatDate(asset.borrow_date)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("asset.fields.returnDate")}:{" "}
                        </span>
                        <span className="font-medium">
                          {asset.return_date
                            ? formatDate(asset.return_date)
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">
                          {t("asset.fields.borrowCondition")}:
                        </span>
                        <ConditionBadge
                          condition={asset.borrow_condition}
                          t={t}
                        />
                      </div>
                      {asset.return_condition && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-muted-foreground">
                            {t("asset.fields.returnCondition")}:
                          </span>
                          <ConditionBadge
                            condition={asset.return_condition}
                            t={t}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mb-3 text-sm">
                      <span className="text-muted-foreground">
                        {t("asset.fields.daysBorrowed")}:{" "}
                      </span>
                      <span className="font-medium">
                        {t("asset.daysBorrowedLabel", {
                          days: asset.days_borrowed,
                        })}
                      </span>
                    </div>

                    {asset.notes && (
                      <div className="mb-3 p-3 bg-muted/50 rounded-md text-sm">
                        <p className="text-muted-foreground">{asset.notes}</p>
                      </div>
                    )}

                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        {canEdit && !asset.return_date && onReturn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReturn(asset)}
                            className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            {t("asset.actions.return")}
                          </Button>
                        )}
                        {canEdit && !asset.return_date && onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(asset)}
                            className="cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            {t("asset.actions.edit")}
                          </Button>
                        )}
                        {canDelete && onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(asset)}
                            className="text-destructive hover:text-destructive hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {t("asset.actions.delete")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="max-w-2xl p-2">
          <DialogTitle className="sr-only">
            {previewImage?.alt ?? "Asset image"}
          </DialogTitle>
          {previewImage && (
            <img
              src={previewImage.src}
              alt={previewImage.alt}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
