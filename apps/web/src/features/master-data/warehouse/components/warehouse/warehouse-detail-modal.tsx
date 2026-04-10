"use client";

import { useTranslations } from "next-intl";
import { MapPin, Edit, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { useWarehouse } from "../../hooks/use-warehouses";
import type { Warehouse as WarehouseType } from "../../types";

interface WarehouseDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly warehouse?: WarehouseType | null;
  readonly onEdit?: (warehouse: WarehouseType) => void;
}

export function WarehouseDetailModal({
  open,
  onOpenChange,
  warehouse,
  onEdit,
}: WarehouseDetailModalProps) {
  const t = useTranslations("warehouse");

  const { data: detailRes, isLoading } = useWarehouse(
    warehouse?.id ?? "",
    { enabled: open && !!warehouse?.id }
  );

  const entity = detailRes?.data ?? warehouse;

  if (!entity) return null;

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
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{entity.name}</DialogTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono">{entity.code}</span>
                <Badge variant={entity.is_active ? "default" : "secondary"} className="text-xs font-medium">
                  {entity.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
                {entity.capacity != null && (
                  <Badge variant="outline" className="text-xs">
                    Cap: {entity.capacity}
                  </Badge>
                )}
                {entity.outlet_id && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Store className="h-3 w-3" />
                    Outlet
                  </Badge>
                )}
                {entity.address && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {entity.address}
                  </span>
                )}
              </div>
            </div>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 cursor-pointer"
                onClick={() => {
                  onEdit(entity);
                  onOpenChange(false);
                }}
                title={t("common.edit")}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {/* Basic Information */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("warehouse.form.description")}</TableCell>
                      <TableCell>{entity.description || "-"}</TableCell>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("warehouse.form.capacity")}</TableCell>
                      <TableCell>{entity.capacity != null ? String(entity.capacity) : "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("common.createdAt")}</TableCell>
                      <TableCell>{entity.created_at ? formatDate(entity.created_at) : "-"}</TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("common.updatedAt")}</TableCell>
                      <TableCell>{entity.updated_at ? formatDate(entity.updated_at) : "-"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("warehouse.sections.location")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("warehouse.form.province")}</TableCell>
                        <TableCell>{province?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("warehouse.form.city")}</TableCell>
                        <TableCell>{city?.name ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("warehouse.form.district")}</TableCell>
                        <TableCell>{district?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("warehouse.form.village")}</TableCell>
                        <TableCell>{village?.name ?? "-"}</TableCell>
                      </TableRow>
                      {areaText && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">Full Area</TableCell>
                          <TableCell colSpan={3}>{areaText}</TableCell>
                        </TableRow>
                      )}
                      {entity.address && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("warehouse.form.address")}</TableCell>
                          <TableCell colSpan={3}>{entity.address}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Coordinates */}
              {(entity.latitude != null || entity.longitude != null) && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("warehouse.sections.coordinates")}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("warehouse.form.latitude")}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{Number(entity.latitude).toFixed(6)}</span>
                          </TableCell>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("warehouse.form.longitude")}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{Number(entity.longitude).toFixed(6)}</span>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">Google Maps</TableCell>
                          <TableCell colSpan={3}>
                            <a
                              href={`https://maps.google.com/?q=${entity.latitude},${entity.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm flex items-center gap-1"
                            >
                              <MapPin className="h-3 w-3" />
                              Open in Maps
                            </a>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
