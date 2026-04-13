"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Edit } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatWhatsAppLink } from "@/lib/utils";
import { useOutlet } from "../../hooks/use-outlets";
import type { Outlet } from "../../types";

interface OutletDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlet: Outlet | null;
  onEdit: (outlet: Outlet) => void;
}

export function OutletDetailDialog({
  open,
  onOpenChange,
  outlet,
  onEdit,
}: OutletDetailDialogProps) {
  const t = useTranslations("outlet");

  const { data: detailRes, isLoading } = useOutlet(
    outlet?.id ?? "",
    { enabled: open && !!outlet?.id }
  );

  const entity = detailRes?.data ?? outlet;

  if (!entity) return null;

  const resolvedArea = [
    entity.village?.name,
    entity.district?.name ?? entity.village?.district?.name,
    entity.city?.name ?? entity.village?.district?.city?.name,
    entity.province?.name ?? entity.village?.district?.city?.province?.name,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{entity.name}</DialogTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{entity.code}</span>
                <Badge variant={entity.is_active ? "default" : "inactive"} className="text-xs font-medium">
                  {entity.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
                {entity.warehouse_id && (
                  <Badge variant="outline" className="text-xs">
                    {t("outlet.hasWarehouse")}
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
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                onClick={() => {
                  onEdit(entity);
                  onOpenChange(false);
                }}
                title={t("common.edit")}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
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
              {/* Contact & Management Info */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("outlet.form.email")}</TableCell>
                      <TableCell>
                        {entity.email ? (
                          <a href={`mailto:${entity.email}`} className="text-primary text-sm hover:underline cursor-pointer">
                            {entity.email}
                          </a>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("outlet.form.phone")}</TableCell>
                      <TableCell>
                        {entity.phone ? (
                          <a
                            href={formatWhatsAppLink(entity.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-sm hover:underline cursor-pointer"
                          >
                            {entity.phone}
                          </a>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("outlet.form.manager")}</TableCell>
                      <TableCell>{entity.manager?.name ?? "-"}</TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("outlet.form.company")}</TableCell>
                      <TableCell>{entity.company?.name ?? "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("outlet.form.description")}</TableCell>
                      <TableCell colSpan={3}>{entity.description || "-"}</TableCell>
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

              {/* Location Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("outlet.sections.location")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("outlet.form.province")}</TableCell>
                        <TableCell>{entity.province?.name ?? entity.village?.district?.city?.province?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("outlet.form.city")}</TableCell>
                        <TableCell>{entity.city?.name ?? entity.village?.district?.city?.name ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("outlet.form.district")}</TableCell>
                        <TableCell>{entity.district?.name ?? entity.village?.district?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("outlet.form.village")}</TableCell>
                        <TableCell>{entity.village?.name ?? "-"}</TableCell>
                      </TableRow>
                      {resolvedArea && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("outlet.sections.fullArea")}</TableCell>
                          <TableCell colSpan={3}>{resolvedArea}</TableCell>
                        </TableRow>
                      )}
                      {entity.address && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("outlet.form.address")}</TableCell>
                          <TableCell colSpan={3}>{entity.address}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Coordinates Section */}
              {(entity.latitude != null || entity.longitude != null) && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("outlet.sections.coordinates")}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("outlet.form.latitude")}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{Number(entity.latitude).toFixed(6)}</span>
                          </TableCell>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("outlet.form.longitude")}</TableCell>
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
