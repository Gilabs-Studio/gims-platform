"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, FileText, Send, Info, DollarSign, Calendar, History, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { TargetForm } from "./target-form";
import { AchievementChart } from "./achievement-chart";
import {
  useDeleteYearlyTarget,
  useUpdateTargetStatus,
  useYearlyTarget,
} from "../hooks/use-targets";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { YearlyTarget, MonthlyTarget } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

interface TargetDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly target: YearlyTarget | null;
}

export function TargetDetailModal({
  open,
  onClose,
  target,
}: TargetDetailModalProps) {
  const deleteTarget = useDeleteYearlyTarget();
  const updateStatus = useUpdateTargetStatus();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("targets");

  // Fetch full detail when modal opens
  const { data: detailData, isLoading } = useYearlyTarget(target?.id ?? "");

  const canEdit = useUserPermission("sales_target.update");
  const canDelete = useUserPermission("sales_target.delete");
  const canApprove = useUserPermission("sales_target.approve");
  const canReject = useUserPermission("sales_target.reject");

  if (!target) return null;

  // Use detailed data if available, otherwise use passed target
  const displayTarget = detailData?.data ?? target;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <FileText className="h-3 w-3 mr-1.5" />
            {t("status.draft")}
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.submitted")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {t("status.rejected")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const handleDelete = async () => {
    if (!target?.id) return;
    try {
      await deleteTarget.mutateAsync(target.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!target?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: target.id,
        status,
      });
      toast.success(t(`status.${status}`));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{displayTarget.code}</DialogTitle>
                <div className="flex items-center gap-3">
                  {getStatusBadge(displayTarget.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayTarget.year} - {displayTarget.area?.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && displayTarget.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="cursor-pointer"
                    title={t("common.edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && displayTarget.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {displayTarget.status === "submitted" && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStatusChange("approved")}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                    title={t("actions.approve")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {displayTarget.status === "submitted" && canReject && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStatusChange("rejected")}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-destructive hover:text-destructive hover:bg-red-50"
                    title={t("actions.reject")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-6 py-4">
              <Skeleton className="h-32 w-full" />
              <div className="grid grid-cols-2 gap-8">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">
                  <Info className="h-4 w-4 mr-2" />
                  {t("tabs.overview")}
                </TabsTrigger>
                <TabsTrigger value="monthly">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("monthlyBreakdown")}
                </TabsTrigger>
                <TabsTrigger value="achievement">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  {t("achievement")}
                </TabsTrigger>
              </TabsList>

            <TabsContent value="overview" className="space-y-8 py-6">
              {/* Hero Section */}
              <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-background border border-primary/20 shadow-sm">
                <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <div className="relative p-8">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-2">
                       <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-5 w-5" />
                        <span className="text-sm font-medium uppercase tracking-wide">{t("totalTarget")}</span>
                      </div>
                      <div className="text-4xl font-bold tracking-tight text-primary">
                        {formatCurrency(displayTarget.total_target)}
                      </div>
                       {displayTarget.notes && (
                        <p className="text-sm text-muted-foreground mt-4 max-w-2xl leading-relaxed">
                          {displayTarget.notes}
                        </p>
                      )}
                    </div>

                     {(displayTarget.submitted_at || displayTarget.approved_at || displayTarget.rejected_at) && (
                      <div className="flex flex-col gap-2 bg-background/80 backdrop-blur-sm rounded-xl p-4 border shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          <History className="h-3.5 w-3.5" />
                          {t("common.workflow")}
                        </div>
                        {displayTarget.submitted_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <Send className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-primary">{t("status.submitted")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayTarget.submitted_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                        {displayTarget.approved_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-success dark:text-success">{t("status.approved")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayTarget.approved_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                        {displayTarget.rejected_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-destructive dark:text-destructive">{t("status.rejected")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayTarget.rejected_at).toLocaleString()}
                              </p>
                               {displayTarget.rejection_reason && (
                                <p className="text-xs mt-1.5 italic text-muted-foreground border-l-2 border-red-300 pl-2">
                                  {displayTarget.rejection_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-card rounded-xl border shadow-sm p-6">
                       <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                           {t("achievementSummary")}
                       </h3>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <p className="text-xs text-muted-foreground mb-1">{t("totalActual")}</p>
                               <p className="text-xl font-bold">{formatCurrency(displayTarget.total_actual)}</p>
                           </div>
                            <div>
                               <p className="text-xs text-muted-foreground mb-1">{t("achievement")}</p>
                               <div className="flex items-center gap-2">
                                   <p className={cn(
                                       "text-xl font-bold",
                                       displayTarget.achievement_percent >= 100 ? "text-success" :
                                           displayTarget.achievement_percent >= 80 ? "text-warning" : "text-destructive"
                                   )}>
                                       {displayTarget.achievement_percent.toFixed(2)}%
                                   </p>
                               </div>
                           </div>
                       </div>
                       
                        {/* Progress Bar */}
                        <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                           <div 
                               className={cn(
                                   "h-full rounded-full transition-all duration-500",
                                    displayTarget.achievement_percent >= 100 ? "bg-success" :
                                    displayTarget.achievement_percent >= 80 ? "bg-warning" : "bg-destructive"
                               )}
                               style={{ width: `${Math.min(100, displayTarget.achievement_percent)}%` }}
                           />
                        </div>
                   </div>

                   <div className="bg-card rounded-xl border shadow-sm p-6">
                       <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                           {t("details")}
                       </h3>
                       <div className="space-y-4">
                           <div className="flex justify-between border-b pb-2">
                               <span className="text-sm text-muted-foreground">{t("area")}</span>
                               <span className="font-medium">{displayTarget.area?.name}</span>
                           </div>
                           <div className="flex justify-between border-b pb-2">
                               <span className="text-sm text-muted-foreground">{t("year")}</span>
                               <span className="font-medium">{displayTarget.year}</span>
                           </div>
                           <div className="flex justify-between border-b pb-2">
                               <span className="text-sm text-muted-foreground">{t("code")}</span>
                               <span className="font-medium">{displayTarget.code}</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="text-sm text-muted-foreground">{t("created")}</span>
                               <span className="font-medium">{formatDate(displayTarget.created_at)}</span>
                           </div>
                       </div>
                   </div>
               </div>
            </TabsContent>

            <TabsContent value="monthly" className="py-4">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("month")}</TableHead>
                                <TableHead className="text-right">{t("targetAmount")}</TableHead>
                                <TableHead className="text-right">{t("actualAmount")}</TableHead>
                                <TableHead className="text-right">{t("achievement")}</TableHead>
                                <TableHead>{t("notes")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayTarget.monthly_targets?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        {t("noData")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayTarget.monthly_targets?.map((monthly: MonthlyTarget) => (
                                    <TableRow key={monthly.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">{monthly.month_name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(monthly.target_amount)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(monthly.actual_amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={
                                                monthly.achievement_percent >= 100 ? "default" :
                                                monthly.achievement_percent >= 80 ? "secondary" : "destructive"
                                            }>
                                                {monthly.achievement_percent.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                            {monthly.notes || "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            <TabsContent value="achievement" className="py-4">
                <AchievementChart target={displayTarget} />
            </TabsContent>
          </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {target && (
        <TargetForm
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          target={target}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteTarget.isPending}
      />
    </>
  );
}
