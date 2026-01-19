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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building,
  MapPin,
  Phone,
  Mail,
  FileText,
  User,
  Calendar,
  Globe,
  Edit,
} from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl">{company.name}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onEdit(company);
                onOpenChange(false);
              }}
              className="cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("common.edit")}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant={company.is_active ? "active" : "inactive"}
            >
              {company.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge 
              variant={
                company.status === 'approved' ? 'success' :
                company.status === 'pending' ? 'warning' :
                company.status === 'rejected' ? 'destructive' : 'secondary'
              }
            >
              {t(`company.status.${company.status}`)}
            </Badge>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building className="h-4 w-4" />
                {t("company.sections.basicInfo")}
              </h3>
              <div className="space-y-3 pl-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-3 w-3" /> {t("company.form.email")}
                  </p>
                  <p className="font-medium">{company.email || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3 w-3" /> {t("company.form.phone")}
                  </p>
                  <p className="font-medium">{company.phone || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-3 w-3" /> {t("company.form.npwp")}
                  </p>
                  <p className="font-medium">{company.npwp || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-3 w-3" /> {t("company.form.nib")}
                  </p>
                  <p className="font-medium">{company.nib || "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t("company.sections.location")}
              </h3>
              <div className="space-y-3 pl-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{company.address || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-medium text-sm">
                    {[
                      company.village?.name,
                      company.village?.district?.name,
                      company.village?.district?.city?.name,
                      company.village?.district?.city?.province?.name,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Coordinates</p>
                  <p className="font-mono text-xs text-muted-foreground bg-muted p-1 rounded w-fit">
                    {company.latitude}, {company.longitude}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Director & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-3 w-3" /> Director ID
              </p>
              <p className="font-medium">{company.director_id || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Created At
              </p>
              <p className="font-medium">
                {company.created_at
                  ? new Date(company.created_at).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
