"use client";

import { useTranslations } from "next-intl";
import { MapPin, Warehouse } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Warehouse as WarehouseType } from "../../types";

interface WarehouseDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly warehouse?: WarehouseType | null;
}

export function WarehouseDetailModal({
  open,
  onOpenChange,
  warehouse,
}: WarehouseDetailModalProps) {
  const t = useTranslations("warehouse");
  // tCommon alias
  const tCommon = useTranslations("warehouse");

  if (!warehouse) return null;

  const location = warehouse.village
    ? [
        warehouse.village.name,
        warehouse.village.district?.name,
        warehouse.village.district?.city?.name,
        warehouse.village.district?.city?.province?.name,
      ]
        .filter(Boolean)
        .join(", ")
    : warehouse.address ?? "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            {warehouse.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("warehouse.form.code")}
              </label>
              <p className="font-mono">{warehouse.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("common.status")}
              </label>
              <div>
                <Badge variant={warehouse.is_active ? "success" : "secondary"}>
                  {warehouse.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {warehouse.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("warehouse.form.description")}
              </label>
              <p className="text-sm">{warehouse.description}</p>
            </div>
          )}

          {/* Capacity */}
          {warehouse.capacity && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("warehouse.form.capacity")}
              </label>
              <p className="text-sm">{warehouse.capacity}</p>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {t("warehouse.sections.location")}
            </label>
            <p className="text-sm">{location}</p>
          </div>

          {/* Coordinates */}
          {warehouse.latitude != null && warehouse.longitude != null && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("warehouse.form.latitude")}
                </label>
                <p className="text-sm font-mono">
                  {Number(warehouse.latitude).toFixed(6)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("warehouse.form.longitude")}
                </label>
                <p className="text-sm font-mono">
                  {Number(warehouse.longitude).toFixed(6)}
                </p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("common.createdAt")}
              </label>
              <p className="text-sm">
                {new Date(warehouse.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("common.updatedAt")}
              </label>
              <p className="text-sm">
                {new Date(warehouse.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
