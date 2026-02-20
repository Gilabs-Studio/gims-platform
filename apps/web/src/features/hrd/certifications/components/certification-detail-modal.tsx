"use client";

import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Calendar,
  FileText,
  Download,
  User,
  Building2,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useEmployee } from "@/features/master-data/employee/hooks/use-employees";
import type { EmployeeCertification } from "../types";

interface CertificationDetailModalProps {
  certification: EmployeeCertification;
  open: boolean;
  onClose: () => void;
}

export function CertificationDetailModal({
  certification,
  open,
  onClose,
}: CertificationDetailModalProps) {
  const t = useTranslations("certification");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "id" ? idLocale : enUS;

  const { data: employeeResponse, isLoading: isLoadingEmployee } = useEmployee(
    open && certification.employee_id ? certification.employee_id : undefined
  );
  const employeeDetails = employeeResponse?.data;

  const getExpiryStatusBadge = () => {
    if (!certification.expiry_date) {
      return (
        <Badge variant="outline" className="text-base">
          {t("status.no_expiry")}
        </Badge>
      );
    }

    if (certification.is_expired) {
      return (
        <Badge variant="destructive" className="text-base">
          {t("status.expired")}
        </Badge>
      );
    }

    if (certification.days_until_expiry <= 30) {
      return (
        <Badge variant="warning" className="text-base">
          <AlertCircle className="mr-1 h-4 w-4" />
          {t("status.expiring_soon")}
        </Badge>
      );
    }

    return (
      <Badge variant="success" className="text-base">
        {t("status.valid")}
      </Badge>
    );
  };

  const getDaysRemainingText = () => {
    if (!certification.expiry_date) {
      return null;
    }

    if (certification.is_expired) {
      return (
        <p className="text-destructive font-medium flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {t("expired_days_ago", { days: Math.abs(certification.days_until_expiry) })}
        </p>
      );
    }

    if (certification.days_until_expiry <= 30) {
      return (
        <p className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {t("days_remaining", { days: certification.days_until_expiry })}
        </p>
      );
    }

    return (
      <p className="text-muted-foreground font-medium flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        {t("days_remaining", { days: certification.days_until_expiry })}
      </p>
    );
  };

  const certificateDownloadUrl =
    certification.certificate_file &&
    (certification.certificate_file.startsWith("http")
      ? certification.certificate_file
      : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${certification.certificate_file.startsWith("/") ? certification.certificate_file : `/${certification.certificate_file}`}`);
  const certificateDownloadFilename =
    certification.certificate_file?.split("/").pop() ?? "certificate.pdf";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t("detail.title")}
          </DialogTitle>
          <DialogDescription>{t("detail.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section — theme-aware */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("field.status")}</p>
                {getExpiryStatusBadge()}
              </div>
              <div>{getDaysRemainingText()}</div>
            </div>
          </div>

          <Separator />

          {/* Employee Information — same as education detail modal */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("detail.employee_info")}
            </h3>
            {isLoadingEmployee ? (
              <div className="rounded-lg border bg-card p-6">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : employeeDetails ? (
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-xl font-semibold">{employeeDetails.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {employeeDetails.employee_code}
                      {employeeDetails.email ? ` • ${employeeDetails.email}` : ""}
                    </p>
                    {employeeDetails.job_position?.name && (
                      <Badge variant="outline">{employeeDetails.job_position.name}</Badge>
                    )}
                  </div>
                  <Link
                    href={
                      certification.employee_id
                        ? `/master-data/employees?openId=${certification.employee_id}`
                        : "/master-data/employees"
                    }
                  >
                    <Button variant="outline" size="sm" className="cursor-pointer shrink-0">
                      {t("detail_view.view_profile")}
                    </Button>
                  </Link>
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("detail_view.employee_code")}</p>
                    <p className="font-medium">{employeeDetails.employee_code}</p>
                  </div>
                  {employeeDetails.email && (
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{employeeDetails.email}</p>
                    </div>
                  )}
                  {employeeDetails.phone && (
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{employeeDetails.phone}</p>
                    </div>
                  )}
                  {employeeDetails.job_position?.name && (
                    <div>
                      <p className="text-muted-foreground">Position</p>
                      <p className="font-medium">{employeeDetails.job_position.name}</p>
                    </div>
                  )}
                  {employeeDetails.division?.name && (
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{employeeDetails.division.name}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {certification.employee_name ?? certification.employee?.name
                    ? `${certification.employee_name ?? certification.employee?.name}${certification.employee_code ?? certification.employee?.employee_code ? ` (${certification.employee_code ?? certification.employee?.employee_code})` : ""}`
                    : certification.employee_id}
                </p>
                {certification.employee_id && (
                  <Link href={`/master-data/employees?openId=${certification.employee_id}`}>
                    <Button variant="outline" size="sm" className="mt-2 cursor-pointer">
                      {t("detail_view.view_profile")}
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Certification Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("detail.certification_info")}
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t("field.certificate_name")}</p>
                <p className="font-medium text-lg">{certification.certificate_name}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">{t("field.issued_by")}</p>
                <p className="font-medium">{certification.issued_by}</p>
              </div>

              {certification.certificate_number && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("field.certificate_number")}</p>
                  <p className="font-medium font-mono">{certification.certificate_number}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("field.issue_date")}</p>
                  <p className="font-medium">
                    {format(new Date(certification.issue_date), "dd MMMM yyyy", {
                      locale: dateLocale,
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">{t("field.expiry_date")}</p>
                  <p className="font-medium">
                    {certification.expiry_date
                      ? format(new Date(certification.expiry_date), "dd MMMM yyyy", {
                          locale: dateLocale,
                        })
                      : t("status.no_expiry")}
                  </p>
                </div>
              </div>

              {certification.description && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("field.description")}</p>
                  <p className="mt-1 text-foreground whitespace-pre-line">
                    {certification.description}
                  </p>
                </div>
              )}

              {certificateDownloadUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t("field.certificate_file")}</p>
                  <Button variant="outline" asChild className="cursor-pointer">
                    <a
                      href={certificateDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={certificateDownloadFilename}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t("action.download_certificate")}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="text-sm text-muted-foreground">
            {certification.created_at && (
              <div className="flex justify-between">
                <span>{t("field.created_at")}:</span>
                <span>
                  {format(new Date(certification.created_at), "dd MMM yyyy HH:mm", {
                    locale: dateLocale,
                  })}
                </span>
              </div>
            )}
            {certification.updated_at && (
              <div className="flex justify-between mt-1">
                <span>{t("field.updated_at")}:</span>
                <span>
                  {format(new Date(certification.updated_at), "dd MMM yyyy HH:mm", {
                    locale: dateLocale,
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="cursor-pointer">
              {tCommon("close")}
            </Button>
            <Button asChild className="cursor-pointer">
              <Link href={`/hrd/certifications/${certification.id}/edit`}>
                {tCommon("edit")}
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
