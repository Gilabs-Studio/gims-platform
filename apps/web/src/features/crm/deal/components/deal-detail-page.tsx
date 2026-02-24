"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Calendar,
  DollarSign,
  Mail,
  Package,
  Pencil,
  Phone,
  Trash2,
  User,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { useDealById, useDeleteDeal } from "../hooks/use-deals";
import { DealFormDialog } from "./deal-form-dialog";
import { MoveStageDialog } from "./move-stage-dialog";
import { DealHistoryTimeline } from "./deal-history-timeline";
import { useUserPermission } from "@/hooks/use-user-permission";
import { PageMotion } from "@/components/motion";
import { toast } from "sonner";
import type { Deal } from "../types";

interface DealDetailPageProps {
  dealId: string;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "won":
      return "default";
    case "lost":
      return "destructive";
    default:
      return "secondary";
  }
}

export function DealDetailPage({ dealId }: DealDetailPageProps) {
  const t = useTranslations("crmDeal");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data: response, isLoading, isError, refetch } = useDealById(dealId);
  const deleteMutation = useDeleteDeal();

  const canUpdate = useUserPermission("crm_deal.update");
  const canDelete = useUserPermission("crm_deal.delete");
  const canMoveStage = useUserPermission("crm_deal.move_stage");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMoveStage, setShowMoveStage] = useState(false);

  const deal: Deal | undefined = response?.data;

  const handleDelete = useCallback(async () => {
    if (!deal) return;
    try {
      await deleteMutation.mutateAsync(deal.id);
      toast.success(t("deleted"));
      router.push("/crm/pipeline");
    } catch {
      toast.error(tCommon("error"));
    }
    setShowDeleteDialog(false);
  }, [deal, deleteMutation, t, tCommon, router]);

  const handleEditSuccess = useCallback(() => {
    toast.success(t("updated"));
    refetch();
  }, [t, refetch]);

  const handleMoveStageSuccess = useCallback(() => {
    toast.success(t("stageMoved"));
    refetch();
  }, [t, refetch]);

  if (isLoading) {
    return <DealDetailSkeleton />;
  }

  if (isError || !deal) {
    return (
      <PageMotion>
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-4">{tCommon("noData")}</p>
          <Button variant="outline" onClick={() => refetch()} className="cursor-pointer">
            {tCommon("retry")}
          </Button>
        </div>
      </PageMotion>
    );
  }

  const isOpen = deal.status === "open";
  const bantCount = [deal.budget_confirmed, deal.auth_confirmed, deal.need_confirmed, deal.time_confirmed]
    .filter(Boolean).length;

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer mt-0.5"
              onClick={() => router.push("/crm/pipeline")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{deal.title}</h1>
                <Badge variant={getStatusVariant(deal.status)}>
                  {deal.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{deal.code}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canMoveStage && isOpen && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setShowMoveStage(true)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-1" />
                {t("moveStage")}
              </Button>
            )}
            {canUpdate && isOpen && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {t("edit")}
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("value")}</p>
            <p className="text-lg font-semibold">{formatCurrency(deal.value)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("probability")}</p>
            <p className="text-2xl font-bold">{deal.probability}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("pipelineStage")}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {deal.pipeline_stage && (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: deal.pipeline_stage.color || "#6b7280" }}
                />
              )}
              <span className="text-sm font-medium">{deal.pipeline_stage?.name ?? "-"}</span>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("bantTitle")}</p>
            <p className="text-2xl font-bold">{bantCount}/4</p>
          </div>
        </div>

        {/* Main content: two columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: deal info */}
          <div className="md:col-span-2 space-y-5">
            {/* Description */}
            {deal.description && (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold mb-2">{t("description")}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {deal.description}
                </p>
              </div>
            )}

            {/* Tabs: Product Items / History */}
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items" className="cursor-pointer">
                  <Package className="h-4 w-4 mr-1" />
                  {t("productItems")} ({deal.items?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="history" className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-1" />
                  {t("history")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="mt-3">
                {!deal.items || deal.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t("noItems")}
                  </p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">{t("product")}</th>
                          <th className="text-right p-3 font-medium">{t("unitPrice")}</th>
                          <th className="text-right p-3 font-medium">{t("qty")}</th>
                          <th className="text-right p-3 font-medium">{t("discountPct")}</th>
                          <th className="text-right p-3 font-medium">{t("subtotal")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deal.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-3">
                              <p className="font-medium">{item.product_name}</p>
                              {item.product_sku && (
                                <p className="text-xs text-muted-foreground">{item.product_sku}</p>
                              )}
                            </td>
                            <td className="text-right p-3">{formatCurrency(item.unit_price)}</td>
                            <td className="text-right p-3">{item.quantity}</td>
                            <td className="text-right p-3">
                              {item.discount_percent > 0 ? `${item.discount_percent}%` : "-"}
                            </td>
                            <td className="text-right p-3 font-medium">
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t bg-muted/30">
                          <td colSpan={4} className="text-right p-3 font-semibold">
                            {t("total")}
                          </td>
                          <td className="text-right p-3 font-semibold">
                            {formatCurrency(deal.value)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-3">
                <DealHistoryTimeline dealId={deal.id} />
              </TabsContent>
            </Tabs>

            {/* Notes */}
            {deal.notes && (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold mb-2">{t("notes")}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {deal.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            {/* Customer */}
            {deal.customer && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("customer")}
                </h4>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{deal.customer.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{deal.customer.code}</p>
              </div>
            )}

            {/* Contact */}
            {deal.contact && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("contact")}
                </h4>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{deal.contact.name}</span>
                </div>
                {deal.contact.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {deal.contact.phone}
                  </div>
                )}
                {deal.contact.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {deal.contact.email}
                  </div>
                )}
              </div>
            )}

            {/* Assigned */}
            {deal.assigned_employee && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("assignedTo")}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {deal.assigned_employee.name.charAt(0)}
                  </div>
                  <span className="text-sm">{deal.assigned_employee.name}</span>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                {t("dates")}
              </h4>
              {deal.expected_close_date && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{t("expectedClose")}:</span>
                  <span className="font-medium">{formatDate(deal.expected_close_date)}</span>
                </div>
              )}
              {deal.actual_close_date && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{t("actualClose")}:</span>
                  <span className="font-medium">{formatDate(deal.actual_close_date)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>{t("createdAt")}:</span>
                <span className="font-medium">{formatDate(deal.created_at)}</span>
              </div>
            </div>

            {/* BANT */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                {t("bantTitle")}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${deal.budget_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span>{t("budget")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${deal.auth_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span>{t("authority")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${deal.need_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span>{t("need")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${deal.time_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span>{t("timeline")}</span>
                </div>
              </div>
              {deal.budget_amount > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <DollarSign className="h-3 w-3" />
                  <span>{formatCurrency(deal.budget_amount)}</span>
                </div>
              )}
            </div>

            {/* Lead */}
            {deal.lead && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("lead")}
                </h4>
                <p className="text-sm font-medium">
                  {deal.lead.first_name} {deal.lead.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{deal.lead.code}</p>
                <Link
                  href={`/crm/leads/${deal.lead.id}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("viewDetail")}
                </Link>
              </div>
            )}

            {/* Close reason */}
            {deal.close_reason && (
              <div className="rounded-lg border p-3 space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("closeReason")}
                </h4>
                <p className="text-sm">{deal.close_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {canUpdate && (
        <DealFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          deal={deal}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Move Stage Dialog */}
      {canMoveStage && (
        <MoveStageDialog
          deal={showMoveStage ? deal : null}
          open={showMoveStage}
          onOpenChange={setShowMoveStage}
          onSuccess={handleMoveStageSuccess}
        />
      )}

      {/* Delete Confirmation */}
      {canDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteDealTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("deleteDealDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t("deleting") : t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageMotion>
  );
}

function DealDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
