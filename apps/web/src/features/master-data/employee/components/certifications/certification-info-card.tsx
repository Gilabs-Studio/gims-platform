"use client";

import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, Download } from "lucide-react";
import { getDisplayFilename } from "@/components/ui/file-upload";
import { resolveImageUrl } from "@/lib/utils";
import type { EmployeeCertificationBrief } from "../../types";

interface CertificationInfoCardProps {
  readonly certification?: EmployeeCertificationBrief | null;
}

function StatusBadge({
  certification,
  t,
}: {
  certification: EmployeeCertificationBrief;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!certification.expiry_date) {
    return (
      <Badge className="bg-mutedgray text-muted-foreground border-gray-500/20">
        {t("certification.status.noExpiry")}
      </Badge>
    );
  }
  if (certification.is_expired) {
    return (
      <Badge className="bg-destructive/15 text-destructive border-red-500/20">
        {t("certification.status.expired")}
      </Badge>
    );
  }
  if (certification.days_until_expiry <= 30) {
    return (
      <Badge className="bg-warning/15 text-warning border-yellow-500/20">
        {t("certification.status.expiringSoon")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-success/15 text-success border-emerald-500/20">
      {t("certification.status.valid")}
    </Badge>
  );
}

export function CertificationInfoCard({
  certification,
}: CertificationInfoCardProps) {
  const t = useTranslations("employee");

  if (!certification) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t("certification.empty.noCertification")}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium bg-muted/50 w-48">
            {t("certification.fields.certificateName")}
          </TableCell>
          <TableCell>{certification.certificate_name}</TableCell>
          <TableCell className="font-medium bg-muted/50 w-48">
            {t("certification.fields.issuedBy")}
          </TableCell>
          <TableCell>{certification.issued_by}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium bg-muted/50">
            {t("certification.fields.issueDate")}
          </TableCell>
          <TableCell>{certification.issue_date || "-"}</TableCell>
          <TableCell className="font-medium bg-muted/50">
            {t("certification.fields.expiryDate")}
          </TableCell>
          <TableCell>
            {certification.expiry_date ? (
              <span className="flex items-center gap-2">
                {certification.expiry_date}
                <StatusBadge certification={certification} t={t} />
              </span>
            ) : (
              <Badge className="bg-mutedgray text-muted-foreground border-gray-500/20">
                {t("certification.status.noExpiry")}
              </Badge>
            )}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium bg-muted/50">
            {t("certification.fields.certificateNumber")}
          </TableCell>
          <TableCell>
            {certification.certificate_number || "-"}
          </TableCell>
          <TableCell className="font-medium bg-muted/50">
            {t("certification.fields.certificateFile")}
          </TableCell>
          <TableCell>
            {certification.certificate_file ? (
              <a
                href={resolveImageUrl(certification.certificate_file) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:text-primary hover:underline cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[300px]">
                  {getDisplayFilename(certification.certificate_file) ||
                    t("certification.fields.certificateFile")}
                </span>
              </a>
            ) : (
              "-"
            )}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
