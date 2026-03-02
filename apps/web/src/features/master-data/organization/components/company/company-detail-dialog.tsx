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
import { formatWhatsAppLink } from "@/lib/utils";
import type { Company } from "../../types";

interface CompanyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onEdit: (company: Company) => void;
}

export function CompanyDetailDialog({
  open,
  onOpenChange,
  company,
  onEdit,
}: CompanyDetailDialogProps) {
  const t = useTranslations("organization");

  if (!company) return null;

  const resolvedArea = [
    company.village?.name,
    company.district?.name ?? company.village?.district?.name,
    company.city?.name ?? company.village?.district?.city?.name,
    company.province?.name ?? company.village?.district?.city?.province?.name,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{company.name}</DialogTitle>
              <div className="flex items-center gap-3">
                <Badge variant={company.is_active ? "default" : "inactive"} className="text-xs font-medium">
                  {company.is_active ? t("company.status.active") : t("company.status.inactive")}
                </Badge>
                {company.address && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {company.address}
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
                  onEdit(company);
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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50 w-48">{t("company.form.email")}</TableCell>
                  <TableCell>
                    {company.email ? (
                      <a href={`mailto:${company.email}`} className="text-primary text-sm hover:underline cursor-pointer">
                        {company.email}
                      </a>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="font-medium bg-muted/50 w-48">{t("company.form.phone")}</TableCell>
                  <TableCell>
                    {company.phone ? (
                      <a
                        href={formatWhatsAppLink(company.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-sm hover:underline cursor-pointer"
                      >
                        {company.phone}
                      </a>
                    ) : "-"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">Director</TableCell>
                  <TableCell>{company.director?.name ?? company.director_id ?? "-"}</TableCell>
                  <TableCell className="font-medium bg-muted/50">Created</TableCell>
                  <TableCell>
                    {company.created_at
                      ? new Date(company.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("company.form.npwp")}</TableCell>
                  <TableCell>{company.npwp || "-"}</TableCell>
                  <TableCell className="font-medium bg-muted/50">{t("company.form.nib")}</TableCell>
                  <TableCell>{company.nib || "-"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">{t("company.sections.location")}</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50 w-48">Province</TableCell>
                    <TableCell>{company.province?.name ?? company.village?.district?.city?.province?.name ?? "-"}</TableCell>
                    <TableCell className="font-medium bg-muted/50 w-48">City</TableCell>
                    <TableCell>{company.city?.name ?? company.village?.district?.city?.name ?? "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">District</TableCell>
                    <TableCell>{company.district?.name ?? company.village?.district?.name ?? "-"}</TableCell>
                    <TableCell className="font-medium bg-muted/50">Village</TableCell>
                    <TableCell>{company.village?.name ?? "-"}</TableCell>
                  </TableRow>
                  {resolvedArea && (
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">Full Area</TableCell>
                      <TableCell colSpan={3}>{resolvedArea}</TableCell>
                    </TableRow>
                  )}
                  {company.address && (
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">Address</TableCell>
                      <TableCell colSpan={3}>{company.address}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {(company.latitude != null || company.longitude != null) && (
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("company.sections.coordinates")}</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-48">Latitude</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{Number(company.latitude).toFixed(6)}</span>
                      </TableCell>
                      <TableCell className="font-medium bg-muted/50 w-48">Longitude</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{Number(company.longitude).toFixed(6)}</span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">Google Maps</TableCell>
                      <TableCell colSpan={3}>
                        <a
                          href={`https://maps.google.com/?q=${company.latitude},${company.longitude}`}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

