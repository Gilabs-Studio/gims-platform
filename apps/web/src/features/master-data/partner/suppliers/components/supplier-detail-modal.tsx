"use client";

import { Edit, Trash2, MapPin, Package, Mail, Phone, Calendar, CheckCircle2, XCircle, FileText, User } from "lucide-react";
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
const SupplierDetailMap = dynamic(
  () => import("./supplier-detail-map").then((mod) => mod.SupplierDetailMap),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading map...</div> }
);
import { useSupplier, useDeleteSupplier, useUpdateSupplier, useApproveSupplier } from "../hooks/use-suppliers";
import { toast } from "sonner";
import { useState } from "react";
import type { CreateSupplierFormData, UpdateSupplierFormData } from "../schemas/supplier.schema";
import { useTranslations } from "next-intl";
import { useHasPermission } from "../hooks/use-has-permission";
import { SupplierForm } from "./supplier-form";

interface SupplierDetailModalProps {
  readonly supplierId: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSupplierUpdated?: () => void;
}

export function SupplierDetailModal({
  supplierId,
  open,
  onOpenChange,
  onSupplierUpdated,
}: SupplierDetailModalProps) {
  const { data, isLoading, error } = useSupplier(supplierId);
  const deleteSupplier = useDeleteSupplier();
  const updateSupplier = useUpdateSupplier();
  const approveSupplier = useApproveSupplier();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("suppliers.detail");

  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const supplier = data?.data;

  const handleDeleteConfirm = async () => {
    if (!supplier || !supplierId) return;
    try {
      await deleteSupplier.mutateAsync(supplierId);
      toast.success(t("toastDeleted"));
      onOpenChange(false);
      onSupplierUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleApprove = async () => {
    if (!supplier || !supplierId) return;
    try {
      await approveSupplier.mutateAsync(supplierId);
      toast.success(t("toastApproved"));
      onSupplierUpdated?.();
    } catch {
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

          {!isLoading && !error && supplier && (
            <div className="space-y-6">
              {/* Enhanced Header Section */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-20 w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    {supplier.logo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={supplier.logo_url} alt={supplier.name} className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      <Package className="h-10 w-10 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight mb-2">{supplier.name}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge 
                        variant={supplier.is_approved ? "default" : "secondary"}
                        className="text-xs font-medium"
                      >
                        {supplier.is_approved ? (
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
                      {supplier.village && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1.5" />
                          {supplier.village.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasApprovePermission && !supplier.is_approved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApprove}
                      disabled={approveSupplier.isPending}
                      className="gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {approveSupplier.isPending ? t("approving") : t("approve")}
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
                {supplier.email && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                          <p className="text-sm font-medium truncate">{supplier.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {supplier.phone && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Phone</p>
                          <p className="text-sm font-medium">{supplier.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {supplier.contact_person && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Contact Person</p>
                          <p className="text-sm font-medium truncate">{supplier.contact_person}</p>
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
                    <Package className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  {supplier.latitude && supplier.longitude && (
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
                          <Package className="h-5 w-5" />
                          Supplier Information
                        </CardTitle>
                        <CardDescription>Basic supplier details and contact information</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Supplier Name
                            </label>
                            <p className="text-sm font-medium">{supplier.name}</p>
                          </div>
                          {supplier.contact_person && (
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Contact Person
                              </label>
                              <p className="text-sm font-medium">{supplier.contact_person}</p>
                            </div>
                          )}
                          {supplier.address && (
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Address
                              </label>
                              <p className="text-sm font-medium">{supplier.address}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Location Tab */}
                  {supplier.latitude && supplier.longitude && (
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
                              <p className="text-sm font-medium font-mono">{supplier.latitude.toFixed(6)}</p>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Longitude
                              </label>
                              <p className="text-sm font-medium font-mono">{supplier.longitude.toFixed(6)}</p>
                            </div>
                          </div>
                          <Separator />
                          <SupplierDetailMap
                            latitude={supplier.latitude}
                            longitude={supplier.longitude}
                            supplierName={supplier.name}
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
                          {supplier.created_by && (
                            <div className="flex items-center justify-between py-2 border-b last:border-0">
                              <span className="text-sm font-medium text-muted-foreground">Created By</span>
                              <span className="text-sm font-medium">{supplier.created_by.name}</span>
                            </div>
                          )}
                          {supplier.approved_by && (
                            <div className="flex items-center justify-between py-2 border-b last:border-0">
                              <span className="text-sm font-medium text-muted-foreground">Approved By</span>
                              <span className="text-sm font-medium">{supplier.approved_by.name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between py-2 border-b last:border-0">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Created At
                            </span>
                            <span className="text-sm font-medium">
                              {new Date(supplier.created_at).toLocaleDateString("id-ID", {
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
                              {new Date(supplier.updated_at).toLocaleDateString("id-ID", {
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
      {isEditDialogOpen && supplier && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <SupplierForm
              supplier={supplier}
              onSubmit={async (formData: CreateSupplierFormData | UpdateSupplierFormData) => {
                try {
                  await updateSupplier.mutateAsync({ id: supplierId!, data: formData });
                  setIsEditDialogOpen(false);
                  toast.success(t("toastUpdated"));
                  onSupplierUpdated?.();
                } catch {
                  // Error already handled in api-client interceptor
                }
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateSupplier.isPending}
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
          supplier
            ? t("deleteDialogDescriptionWithName", { name: supplier.name })
            : t("deleteDialogDescription")
        }
        itemName={t("deleteDialogItemName")}
        isLoading={deleteSupplier.isPending}
      />
    </>
  );
}
