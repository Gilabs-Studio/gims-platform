"use client";

import { Edit, Trash2, MapPin, Building, Mail, Phone, Calendar, X, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MapPicker } from "@/components/ui/map/map-picker";
import dynamic from "next/dynamic";

// Dynamic import untuk Leaflet map di detail
const CompanyDetailMap = dynamic(
  () => import("./company-detail-map").then((mod) => mod.CompanyDetailMap),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading map...</div> }
);
import { useCompany, useDeleteCompany, useUpdateCompany, useApproveCompany } from "../hooks/use-companies";
import { toast } from "sonner";
import { useState } from "react";
import { CompanyForm } from "./company-form";
import type { Company } from "../types";
import { useTranslations } from "next-intl";
import { useHasPermission } from "../hooks/use-has-permission";
import type { UpdateCompanyFormData } from "../schemas/company.schema";

interface CompanyDetailModalProps {
  readonly companyId: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCompanyUpdated?: () => void;
}

export function CompanyDetailModal({
  companyId,
  open,
  onOpenChange,
  onCompanyUpdated,
}: CompanyDetailModalProps) {
  const { data, isLoading, error } = useCompany(companyId);
  const deleteCompany = useDeleteCompany();
  const updateCompany = useUpdateCompany();
  const approveCompany = useApproveCompany();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("companyManagement.detailModal");

  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const company = data?.data;

  const handleDeleteConfirm = async () => {
    if (!company || !companyId) return;
    try {
      await deleteCompany.mutateAsync(companyId);
      toast.success(t("toastDeleted"));
      onOpenChange(false);
      onCompanyUpdated?.();
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  const handleApprove = async () => {
    if (!company || !companyId) return;
    try {
      await approveCompany.mutateAsync(companyId);
      toast.success(t("toastApproved"));
      onCompanyUpdated?.();
    } catch (error) {
      // Error already handled in api-client interceptor
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <div className="text-center text-muted-foreground py-8">
              {t("loadError")}
            </div>
          )}

          {!isLoading && !error && company && (
            <div className="space-y-6">
              {/* Header with Actions */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{company.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={company.is_approved ? "default" : "secondary"}>
                        {company.is_approved ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t("approved")}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            {t("pending")}
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasApprovePermission && !company.is_approved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApprove}
                      disabled={approveCompany.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {approveCompany.isPending ? t("approving") : t("approve")}
                    </Button>
                  )}
                  {hasEditPermission && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t("edit")}
                    </Button>
                  )}
                  {hasDeletePermission && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                      {t("delete")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("companyInfo.title")}</CardTitle>
                  <CardDescription>{t("companyInfo.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("companyInfo.name")}
                      </label>
                      <p className="mt-1">{company.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("companyInfo.email")}
                      </label>
                      <p className="mt-1 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {company.email ?? "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("companyInfo.phone")}
                      </label>
                      <p className="mt-1 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {company.telp ?? "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("companyInfo.address")}
                      </label>
                      <p className="mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {company.address ?? "-"}
                      </p>
                    </div>
                    {company.village && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t("companyInfo.location")}
                        </label>
                        <p className="mt-1">
                          {company.village.name}, {company.village.district_name}
                        </p>
                      </div>
                    )}
                    {company.director && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t("companyInfo.director")}
                        </label>
                        <p className="mt-1">{company.director.name}</p>
                      </div>
                    )}
                    {company.npwp && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          NPWP
                        </label>
                        <p className="mt-1">{company.npwp}</p>
                      </div>
                    )}
                    {company.nib && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          NIB
                        </label>
                        <p className="mt-1">{company.nib}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location Map */}
              {company.latitude && company.longitude && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("location.title")}</CardTitle>
                    <CardDescription>{t("location.description")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompanyDetailMap
                      latitude={company.latitude}
                      longitude={company.longitude}
                      companyName={company.name}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("metadata.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {company.created_by && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("metadata.createdBy")}</span>
                      <span>{company.created_by.name}</span>
                    </div>
                  )}
                  {company.approved_by && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("metadata.approvedBy")}</span>
                      <span>{company.approved_by.name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t("metadata.createdAt")}
                    </span>
                    <span>
                      {new Date(company.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t("metadata.updatedAt")}
                    </span>
                    <span>
                      {new Date(company.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {isEditDialogOpen && company && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <CompanyForm
              company={company}
              onSubmit={async (formData) => {
                try {
                  await updateCompany.mutateAsync({ id: companyId!, data: formData });
                  setIsEditDialogOpen(false);
                  toast.success(t("toastUpdated"));
                  onCompanyUpdated?.();
                } catch (error) {
                  // Error already handled in api-client interceptor
                }
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateCompany.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={t("deleteDialogTitle")}
        description={
          company
            ? t("deleteDialogDescriptionWithName", { name: company.name })
            : t("deleteDialogDescription")
        }
        itemName={t("deleteDialogItemName")}
        isLoading={deleteCompany.isPending}
      />
    </>
  );
}

