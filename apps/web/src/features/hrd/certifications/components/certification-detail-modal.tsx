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
import {
  AlertCircle,
  Calendar,
  FileText,
  Download,
  User,
  Building2,
} from "lucide-react";
import { Link } from "@/i18n/routing";
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

  const getExpiryStatusBadge = () => {
    if (!certification.expiry_date) {
      return (
        <Badge variant="outline" className="bg-gray-50">
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
        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-base">
          <AlertCircle className="mr-1 h-4 w-4" />
          {t("status.expiring_soon")}
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-base">
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
        <p className="text-red-600 font-medium flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {t("expired_days_ago", { days: Math.abs(certification.days_until_expiry) })}
        </p>
      );
    }

    if (certification.days_until_expiry <= 30) {
      return (
        <p className="text-yellow-600 font-medium flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {t("days_remaining", { days: certification.days_until_expiry })}
        </p>
      );
    }

    return (
      <p className="text-green-600 font-medium flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        {t("days_remaining", { days: certification.days_until_expiry })}
      </p>
    );
  };

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
          {/* Status Section */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t("field.status")}</p>
                {getExpiryStatusBadge()}
              </div>
              <div>{getDaysRemainingText()}</div>
            </div>
          </div>

          <Separator />

          {/* Employee Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("detail.employee_info")}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("field.employee_code")}:</span>
                <span className="font-medium">
                  {certification.employee?.employee_code ?? "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("field.employee_name")}:</span>
                <span className="font-medium">
                  {certification.employee?.name ?? "-"}
                </span>
              </div>
            </div>
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
                <p className="text-sm text-gray-600">{t("field.certificate_name")}</p>
                <p className="font-medium text-lg">{certification.certificate_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">{t("field.issued_by")}</p>
                <p className="font-medium">{certification.issued_by}</p>
              </div>

              {certification.certificate_number && (
                <div>
                  <p className="text-sm text-gray-600">{t("field.certificate_number")}</p>
                  <p className="font-medium font-mono">{certification.certificate_number}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{t("field.issue_date")}</p>
                  <p className="font-medium">
                    {format(new Date(certification.issue_date), "dd MMMM yyyy", {
                      locale: dateLocale,
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">{t("field.expiry_date")}</p>
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
                  <p className="text-sm text-gray-600">{t("field.description")}</p>
                  <p className="mt-1 text-gray-800 whitespace-pre-line">
                    {certification.description}
                  </p>
                </div>
              )}

              {certification.certificate_file && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">{t("field.certificate_file")}</p>
                  <Button variant="outline" asChild className="cursor-pointer">
                    <a
                      href={certification.certificate_file}
                      target="_blank"
                      rel="noopener noreferrer"
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
          <div className="text-sm text-gray-500">
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
