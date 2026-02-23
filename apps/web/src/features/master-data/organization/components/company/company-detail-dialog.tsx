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
import type { Company } from "../../types";

interface CompanyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onEdit: (company: Company) => void;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-0.5">{label}</span>
      <span className="text-xs font-medium wrap-break-word">{value ?? "-"}</span>
    </div>
  );
}

function GroupBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      {children}
    </div>
  );
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
      <DialogContent
        size="lg"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                {company.name}
              </DialogTitle>
              {company.address && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {company.address}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default" className="h-5 text-[10px]">
                  {company.is_active ? t("company.status.active") : t("company.status.inactive")}
                </Badge>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="shrink-0 cursor-pointer"
              onClick={() => {
                onEdit(company);
                onOpenChange(false);
              }}
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              {t("common.edit")}
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable flat body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Basic Info + Legal Info side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GroupBox title={t("company.sections.basicInfo")}>
              <InfoRow label={t("company.form.email")} value={company.email} />
              <InfoRow label={t("company.form.phone")} value={company.phone} />
              <InfoRow label="Director" value={company.director?.name ?? company.director_id} />
            </GroupBox>

            <GroupBox title={t("company.sections.legalInfo")}>
              <InfoRow label={t("company.form.npwp")} value={company.npwp} />
              <InfoRow label={t("company.form.nib")} value={company.nib} />
              <InfoRow
                label="Created"
                value={
                  company.created_at
                    ? new Date(company.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : undefined
                }
              />
            </GroupBox>
          </div>

          {/* Location */}
          <GroupBox title={t("company.sections.location")}>
            <InfoRow label="Address" value={company.address} />
            <InfoRow
              label="Province"
              value={
                company.province?.name ??
                company.village?.district?.city?.province?.name
              }
            />
            <InfoRow
              label="City"
              value={company.city?.name ?? company.village?.district?.city?.name}
            />
            <InfoRow
              label="District"
              value={company.district?.name ?? company.village?.district?.name}
            />
            <InfoRow label="Village" value={company.village?.name} />
            {resolvedArea && <InfoRow label="Full Area" value={resolvedArea} />}
          </GroupBox>

          {/* Coordinates (optional) */}
          {(company.latitude != null || company.longitude != null) && (
            <GroupBox title={t("company.sections.coordinates")}>
              <InfoRow
                label="Latitude"
                value={
                  company.latitude != null ? (
                    <span className="font-mono text-xs">
                      {Number(company.latitude).toFixed(6)}
                    </span>
                  ) : undefined
                }
              />
              <InfoRow
                label="Longitude"
                value={
                  company.longitude != null ? (
                    <span className="font-mono text-xs">
                      {Number(company.longitude).toFixed(6)}
                    </span>
                  ) : undefined
                }
              />
              <InfoRow
                label="Google Maps"
                value={
                  company.latitude != null && company.longitude != null ? (
                    <a
                      href={`https://maps.google.com/?q=${company.latitude},${company.longitude}`}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
