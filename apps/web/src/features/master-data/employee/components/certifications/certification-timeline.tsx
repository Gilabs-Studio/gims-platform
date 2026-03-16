"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Minus,
  Download,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { getDisplayFilename } from "@/components/ui/file-upload";
import { resolveImageUrl } from "@/lib/utils";
import type { EmployeeCertification } from "../../types";

interface CertificationTimelineProps {
  readonly certifications: EmployeeCertification[];
  readonly onAdd?: () => void;
  readonly onEdit?: (cert: EmployeeCertification) => void;
  readonly onDelete?: (cert: EmployeeCertification) => void;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
}

type CertStatus = "valid" | "expiring_soon" | "expired" | "no_expiry";

function getCertStatus(cert: EmployeeCertification): CertStatus {
  if (!cert.expiry_date) return "no_expiry";
  if (cert.is_expired) return "expired";
  if (cert.days_until_expiry <= 30) return "expiring_soon";
  return "valid";
}

function getStatusColor(status: CertStatus) {
  switch (status) {
    case "valid":
      return "bg-success";
    case "expiring_soon":
      return "bg-warning";
    case "expired":
      return "bg-destructive";
    case "no_expiry":
      return "bg-mutedgray";
  }
}

function StatusIcon({ status }: { status: CertStatus }) {
  switch (status) {
    case "valid":
      return <CheckCircle className="h-5 w-5 text-white" />;
    case "expiring_soon":
      return <AlertTriangle className="h-5 w-5 text-white" />;
    case "expired":
      return <XCircle className="h-5 w-5 text-white" />;
    case "no_expiry":
      return <Minus className="h-5 w-5 text-white" />;
  }
}

function StatusBadge({
  status,
  t,
}: {
  status: CertStatus;
  t: ReturnType<typeof useTranslations>;
}) {
  const badgeMap: Record<CertStatus, { className: string; key: string }> = {
    valid: {
      className:
        "bg-success/15 text-success border-emerald-500/20",
      key: "certification.status.valid",
    },
    expiring_soon: {
      className:
        "bg-warning/15 text-warning border-yellow-500/20",
      key: "certification.status.expiringSoon",
    },
    expired: {
      className: "bg-destructive/15 text-destructive border-red-500/20",
      key: "certification.status.expired",
    },
    no_expiry: {
      className: "bg-mutedgray text-muted-foreground border-gray-500/20",
      key: "certification.status.noExpiry",
    },
  };

  const config = badgeMap[status];
  return (
    <Badge className={config.className}>
      {t(config.key as Parameters<typeof t>[0])}
    </Badge>
  );
}

export function CertificationTimeline({
  certifications,
  onAdd,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: CertificationTimelineProps) {
  const t = useTranslations("employee");

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP");
  };

  const sorted = [...certifications].sort(
    (a, b) =>
      new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime(),
  );

  return (
    <div>
      {onAdd && canEdit && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={onAdd} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1" />
            {t("certification.actions.create")}
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("certification.empty.noHistory")}</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {sorted.map((cert) => {
              const status = getCertStatus(cert);

              return (
                <div key={cert.id} className="relative flex gap-4">
                  <div
                    className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${getStatusColor(
                      status,
                    )} flex items-center justify-center shadow-md`}
                  >
                    <StatusIcon status={status} />
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="font-semibold text-base">
                            {cert.certificate_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {cert.issued_by}
                          </p>
                        </div>
                        <StatusBadge status={status} t={t} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {t("certification.fields.issueDate")}:{" "}
                          </span>
                          <span className="font-medium">
                            {formatDate(cert.issue_date)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("certification.fields.expiryDate")}:{" "}
                          </span>
                          <span className="font-medium">
                            {cert.expiry_date
                              ? formatDate(cert.expiry_date)
                              : t("certification.status.noExpiry")}
                          </span>
                        </div>
                      </div>

                      {cert.certificate_number && (
                        <div className="mb-3 text-sm">
                          <span className="text-muted-foreground">
                            {t("certification.fields.certificateNumber")}:{" "}
                          </span>
                          <span className="font-medium">
                            {cert.certificate_number}
                          </span>
                        </div>
                      )}

                      {cert.description && (
                        <div className="mb-3 p-3 bg-muted/50 rounded-md text-sm">
                          <p className="text-muted-foreground">
                            {cert.description}
                          </p>
                        </div>
                      )}

                      {cert.certificate_file && (
                        <div className="mb-3 p-3 bg-muted/50 rounded-md text-sm flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {t("certification.fields.certificateFile")}:{" "}
                          </span>
                          <a
                            href={
                              resolveImageUrl(cert.certificate_file) ?? "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:text-primary hover:underline cursor-pointer font-medium"
                          >
                            <Download className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[300px]">
                              {getDisplayFilename(cert.certificate_file) ||
                                t("certification.fields.certificateFile")}
                            </span>
                          </a>
                        </div>
                      )}

                      {(canEdit || canDelete) && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {canEdit && onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(cert)}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              {t("certification.actions.edit")}
                            </Button>
                          )}
                          {canDelete && onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(cert)}
                              className="text-destructive hover:text-destructive hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              {t("certification.actions.delete")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
