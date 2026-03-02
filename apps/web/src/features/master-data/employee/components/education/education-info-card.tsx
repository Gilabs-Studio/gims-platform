"use client";

import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Download } from "lucide-react";
import { getDisplayFilename } from "@/components/ui/file-upload";
import { resolveImageUrl } from "@/lib/utils";
import type { EmployeeEducationBrief } from "../../types";

interface EducationInfoCardProps {
  readonly education?: EmployeeEducationBrief | null;
}

export function EducationInfoCard({ education }: EducationInfoCardProps) {
  const t = useTranslations("employee");

  if (!education) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t("education.empty.noEducation")}</p>
      </div>
    );
  }

  const degreeLabel =
    t(`education.degrees.${education.degree}` as Parameters<typeof t>[0]) ??
    education.degree;

  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium bg-muted/50 w-48">
            {t("education.fields.institution")}
          </TableCell>
          <TableCell>{education.institution}</TableCell>
          <TableCell className="font-medium bg-muted/50 w-48">
            {t("education.fields.degree")}
          </TableCell>
          <TableCell>
            <Badge variant="outline">{degreeLabel}</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium bg-muted/50">
            {t("education.fields.fieldOfStudy")}
          </TableCell>
          <TableCell>{education.field_of_study || "-"}</TableCell>
          <TableCell className="font-medium bg-muted/50">
            {t("education.fields.gpa")}
          </TableCell>
          <TableCell>
            {education.gpa != null ? education.gpa.toFixed(2) : "-"}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium bg-muted/50">
            {t("education.fields.startDate")}
          </TableCell>
          <TableCell>{education.start_date || "-"}</TableCell>
          <TableCell className="font-medium bg-muted/50">
            {t("education.fields.endDate")}
          </TableCell>
          <TableCell>
            {education.end_date ?? (
              <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20">
                {t("education.fields.ongoing")}
              </Badge>
            )}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium bg-muted/50">
            {t("education.fields.document")}
          </TableCell>
          <TableCell colSpan={3}>
            {education.document_path ? (
              <a
                href={resolveImageUrl(education.document_path) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[300px]">
                  {getDisplayFilename(education.document_path) ||
                    t("education.fields.document")}
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
