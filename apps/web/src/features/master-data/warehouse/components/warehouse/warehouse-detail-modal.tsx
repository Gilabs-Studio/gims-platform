"use client";

import { useTranslations } from "next-intl";
import { MapPin, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWarehouse } from "../../hooks/use-warehouses";
import type { Warehouse as WarehouseType } from "../../types";

interface WarehouseDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly warehouse?: WarehouseType | null;
  readonly onEdit?: (warehouse: WarehouseType) => void;
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {label}
      </span>
      <span className="text-xs font-medium wrap-break-word">{value ?? "-"}</span>
    </div>
  );
}

function GroupBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export function WarehouseDetailModal({
  open,
  onOpenChange,
  warehouse,
  onEdit,
}: WarehouseDetailModalProps) {
  const t = useTranslations("warehouse");

  // Always fetch fresh detail when the modal opens so geographic names
  // reflect the latest saved values (list cache may be stale after an edit).
  const { data: detailRes, isLoading } = useWarehouse(
    warehouse?.id ?? "",
    { enabled: open && !!warehouse?.id }
  );

  const entity = detailRes?.data ?? warehouse;

  if (!entity) return null;

  // Resolve geographic hierarchy from nested village or direct FK fields
  const village = entity.village;
  const districtVillage = village?.district;
  const cityVillage = districtVillage?.city;
  const provinceVillage = cityVillage?.province;

  const district = districtVillage ?? entity.district;
  const city = cityVillage ?? entity.city;
  const province = provinceVillage ?? entity.province;

  const areaText = [village?.name, district?.name, city?.name, province?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
        {/* Header — mirrors supplier: name, code, badges, edit button */}
        <DialogHeader className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                {entity.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {entity.code}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant={entity.is_active ? "default" : "secondary"}
                  className="h-5 text-[10px]"
                >
                  {entity.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
                {entity.capacity != null && (
                  <Badge variant="outline" className="h-5 text-[10px]">
                    Cap: {entity.capacity}
                  </Badge>
                )}
              </div>
            </div>

            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 cursor-pointer"
                onClick={() => {
                  onEdit(entity);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                {t("common.edit")}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Flat scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {/* Basic Info + Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GroupBox title={t("warehouse.sections.basicInfo")}>
                  <InfoRow
                    label={t("warehouse.form.description")}
                    value={entity.description}
                  />
                  <InfoRow
                    label={t("warehouse.form.capacity")}
                    value={entity.capacity != null ? String(entity.capacity) : undefined}
                  />
                </GroupBox>

                <GroupBox title={t("warehouse.sections.location")}>
                  <InfoRow
                    label={t("warehouse.form.address")}
                    icon={MapPin}
                    value={entity.address}
                  />
                  <InfoRow label={t("warehouse.form.province")} value={province?.name} />
                  <InfoRow label={t("warehouse.form.city")} value={city?.name} />
                  <InfoRow label={t("warehouse.form.district")} value={district?.name} />
                  <InfoRow label={t("warehouse.form.village")} value={village?.name} />
                  {areaText && <InfoRow label="Full Area" value={areaText} />}
                </GroupBox>
              </div>

              {/* Coordinates — shown only when at least one coordinate is present */}
              {(entity.latitude != null || entity.longitude != null) && (
                <GroupBox title={t("warehouse.sections.coordinates")}>
                  <InfoRow
                    label={t("warehouse.form.latitude")}
                    value={
                      entity.latitude != null ? (
                        <span className="font-mono text-xs">
                          {Number(entity.latitude).toFixed(6)}
                        </span>
                      ) : undefined
                    }
                  />
                  <InfoRow
                    label={t("warehouse.form.longitude")}
                    value={
                      entity.longitude != null ? (
                        <span className="font-mono text-xs">
                          {Number(entity.longitude).toFixed(6)}
                        </span>
                      ) : undefined
                    }
                  />
                  <InfoRow
                    label="Google Maps"
                    value={
                      entity.latitude != null && entity.longitude != null ? (
                        <a
                          href={`https://maps.google.com/?q=${entity.latitude},${entity.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 text-xs"
                        >
                          Open in Maps
                        </a>
                      ) : undefined
                    }
                  />
                </GroupBox>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

