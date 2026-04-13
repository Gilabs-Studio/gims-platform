"use client";

import { Building, MapPin, Eye, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Company } from "../../types";



interface CompanyCardProps {
  readonly company: Company;
  readonly isSelected?: boolean;
  readonly onClick?: () => void;
  readonly t: (key: string) => string;
  readonly onDetail?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly onStatusChange?: (isActive: boolean) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
  readonly isStatusChanging?: boolean;
}

export function CompanyCard({
  company,
  isSelected,
  onClick,
  t,
  onDetail,
  onEdit,
  onDelete,
  onStatusChange,
  canUpdate,
  canDelete,
  isStatusChanging,
}: CompanyCardProps) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const handleStatusChangeClick = (checked: boolean) => {
    // If activating, no confirmation needed
    if (checked) {
      onStatusChange?.(checked);
      return;
    }

    // If deactivating, show confirmation
    setShowDeactivateConfirm(true);
  };

  const handleConfirmDeactivate = () => {
    setShowDeactivateConfirm(false);
    onStatusChange?.(false);
  };

  return (
    <>
      <div
        onClick={onClick}
        className={cn(
          "group relative p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors pr-24",
          isSelected && "bg-accent border-l-4 border-l-primary",
          !company.is_active && "bg-muted/30 opacity-60"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-full p-2 shrink-0",
              company.is_active ? "bg-primary/10" : "bg-muted/50"
            )}
          >
            <Building
              className={cn(
                "h-4 w-4",
                company.is_active ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <h4
                className={cn(
                  "font-medium text-sm truncate",
                  !company.is_active && "line-through text-muted-foreground"
                )}
              >
                {company.name}
              </h4>
              {!company.is_active && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {t("common.inactive")}
                </Badge>
              )}
            </div>
            {company.address && (
              <p
                className={cn(
                  "text-xs truncate flex items-center gap-1",
                  company.is_active ? "text-muted-foreground" : "text-muted-foreground/70"
                )}
              >
                <MapPin className="h-3 w-3 shrink-0" />
                {company.address}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {company.latitude != null && company.longitude != null && (
                <span className="text-xs text-muted-foreground">
                  {Number(company.latitude).toFixed(4)}, {Number(company.longitude).toFixed(4)}
                </span>
              )}
              {(company.outlet_count ?? 0) > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] h-4 px-1.5 cursor-default",
                    !company.is_active && "opacity-60"
                  )}
                >
                  {company.outlet_count} {t("company.outlets")}
                </Badge>
              )}
            </div>
            {canUpdate && onStatusChange && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <Switch
                  checked={company.is_active}
                  onCheckedChange={handleStatusChangeClick}
                  disabled={isStatusChanging}
                  className="cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  {company.is_active ? t("common.active") : t("common.inactive")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1 border shadow-sm">
          {onDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetail();
              }}
              className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="View Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}

          {canUpdate && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 rounded-full hover:bg-accent text-warning hover:text-warning transition-colors"
              title="Edit"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-full hover:bg-accent text-destructive hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("company.deactivateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("company.deactivateWarning")}</AlertDialogDescription>
            {company.outlet_count && company.outlet_count > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-sm mt-2">
                <div className="font-medium text-destructive mb-2">{t("company.cascadeInfo")}</div>
                <ul className="text-xs text-destructive/80 list-disc list-inside space-y-1">
                  <li>
                    {company.outlet_count} {" "}
                    {company.outlet_count === 1
                      ? t("company.cascadeOutletSingle")
                      : t("company.cascadeOutletPlural")}
                  </li>
                  <li>{t("company.cascadeWarehouse")}</li>
                </ul>
              </div>
            )}
            <div className="font-medium text-sm mt-2">{t("company.deactivateConfirm")}</div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
            >
              {t("common.deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
