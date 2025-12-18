"use client";

import { Edit, Trash2, MapPin, Building, Mail, Phone, Calendar, CheckCircle2, XCircle, FileText, User, Globe, Hash } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsContents } from "@/components/ui/tabs";
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
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-7 w-64" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
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
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <div className="text-center text-muted-foreground py-12">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-lg font-medium">{t("loadError")}</p>
            </div>
          )}

          {!isLoading && !error && company && (
            <div className="space-y-6">
              {/* Enhanced Header Section */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-20 w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <Building className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight mb-2">{company.name}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge 
                        variant={company.is_approved ? "default" : "secondary"}
                        className="text-xs font-medium"
                      >
                        {company.is_approved ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                            {t("approved")}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1.5" />
                            {t("pending")}
                          </>
                        )}
                      </Badge>
                      {company.village && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1.5" />
                          {company.village.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasApprovePermission && !company.is_approved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApprove}
                      disabled={approveCompany.isPending}
                      className="gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {approveCompany.isPending ? t("approving") : t("approve")}
                    </Button>
                  )}
                  {hasEditPermission && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      {t("edit")}
                    </Button>
                  )}
                  {hasDeletePermission && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("delete")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {company.email && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                          <p className="text-sm font-medium truncate">{company.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {company.telp && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Phone</p>
                          <p className="text-sm font-medium">{company.telp}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {company.director && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Director</p>
                          <p className="text-sm font-medium truncate">{company.director.name}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tabs for Organized Information */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="overview" className="gap-2">
                    <Building className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  {company.latitude && company.longitude && (
                    <TabsTrigger value="location" className="gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="metadata" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Metadata
                  </TabsTrigger>
                </TabsList>

                <TabsContents className="mt-6">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Company Information
                        </CardTitle>
                        <CardDescription>Basic company details and contact information</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Company Name
                            </label>
                            <p className="text-sm font-medium">{company.name}</p>
                          </div>
                          {company.village && (
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Location
                              </label>
                              <p className="text-sm font-medium">
                                {company.village.name}, {company.village.district_name}
                              </p>
                            </div>
                          )}
                          {company.address && (
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Address
                              </label>
                              <p className="text-sm font-medium">{company.address}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {(company.npwp || company.nib) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Hash className="h-5 w-5" />
                            Legal Documents
                          </CardTitle>
                          <CardDescription>Company registration and tax information</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {company.npwp && (
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  NPWP
                                </label>
                                <p className="text-sm font-medium font-mono">{company.npwp}</p>
                              </div>
                            )}
                            {company.nib && (
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  NIB
                                </label>
                                <p className="text-sm font-medium font-mono">{company.nib}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Location Tab */}
                  {company.latitude && company.longitude && (
                    <TabsContent value="location" className="space-y-6 mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Map Location
                          </CardTitle>
                          <CardDescription>Geographic coordinates and map view</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Latitude
                              </label>
                              <p className="text-sm font-medium font-mono">{company.latitude.toFixed(6)}</p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Longitude
                              </label>
                              <p className="text-sm font-medium font-mono">{company.longitude.toFixed(6)}</p>
                            </div>
                          </div>
                          <Separator />
                          <CompanyDetailMap
                            latitude={company.latitude}
                            longitude={company.longitude}
                            companyName={company.name}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Metadata Tab */}
                  <TabsContent value="metadata" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          System Information
                        </CardTitle>
                        <CardDescription>Audit trail and system metadata</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {company.created_by && (
                            <>
                              <div className="flex items-center justify-between py-2 border-b last:border-0">
                                <span className="text-sm font-medium text-muted-foreground">Created By</span>
                                <span className="text-sm font-medium">{company.created_by.name}</span>
                              </div>
                            </>
                          )}
                          {company.approved_by && (
                            <div className="flex items-center justify-between py-2 border-b last:border-0">
                              <span className="text-sm font-medium text-muted-foreground">Approved By</span>
                              <span className="text-sm font-medium">{company.approved_by.name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between py-2 border-b last:border-0">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Created At
                            </span>
                            <span className="text-sm font-medium">
                              {new Date(company.created_at).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Updated At
                            </span>
                            <span className="text-sm font-medium">
                              {new Date(company.updated_at).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </TabsContents>
              </Tabs>
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

