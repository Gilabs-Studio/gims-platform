"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileText, Send, CheckCircle, XCircle, Archive, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageMotion } from "@/components/motion";
import { useStockOpname, useUpdateStockOpnameStatus, useGenerateStockOpnameJournal, useSubmitStockOpnameApproval } from "../hooks/use-stock-opnames";
import { StockOpnameStatusBadge } from "./stock-opname-status-badge";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatDate } from "@/lib/utils";
import { getStockOpnameErrorMessage, isStockOpnameMappingError } from "../utils/error-utils";
import { StockOpnameManagerView } from "./stock-opname-manager-view";
import { StockOpnameCounterView } from "./stock-opname-counter-view";
import type { StockOpnameDraftActions } from "./stock-opname-manager-view";

interface Props {
  id: string;
}

export function StockOpnameDetailPage({ id }: Props) {
  const t = useTranslations("stock_opname");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data, isLoading, isError } = useStockOpname(id);
  const opname = data?.data;

  const canUpdate = useUserPermission("stock_opname.update");
  const canApprove = useUserPermission("stock_opname.approve");
  const canPost = useUserPermission("stock_opname.post");

  const statusMutation = useUpdateStockOpnameStatus();
  const generateJournalMutation = useGenerateStockOpnameJournal();
  const submitApprovalMutation = useSubmitStockOpnameApproval();
  const draftActionsRef = useRef<StockOpnameDraftActions | null>(null);
  const [isSyncingDraftBeforeAction, setIsSyncingDraftBeforeAction] = useState(false);

  const isManagerView = canApprove || canPost;

  const handleStatusChange = async (newStatus: string) => {
    if (!opname) return;
    try {
      if (opname.status === "draft") {
        setIsSyncingDraftBeforeAction(true);
        const didFlushDraft = await draftActionsRef.current?.flushPendingDrafts();
        setIsSyncingDraftBeforeAction(false);
        if (didFlushDraft === false) {
          toast.error(tCommon("error"));
          return;
        }
      }

      if (newStatus === "pending_approval") {
        await generateJournalMutation.mutateAsync(opname.id);
        await submitApprovalMutation.mutateAsync(opname.id);
        toast.success(tCommon("saved"));
        return;
      }
      await statusMutation.mutateAsync({ id: opname.id, data: { status: newStatus as never } });
      toast.success(tCommon("saved"));
    } catch (error) {
      setIsSyncingDraftBeforeAction(false);
      if (isStockOpnameMappingError(error)) {
        toast.error(t("errors.mappingRequired"), {
          action: {
            label: t("actions.openMapping"),
            onClick: () => router.push("/finance/settings/accounting-mapping"),
          },
        });
        return;
      }
      toast.error(getStockOpnameErrorMessage(error, tCommon("error")));
    }
  };

  const isActionPending =
    isSyncingDraftBeforeAction ||
    statusMutation.isPending ||
    generateJournalMutation.isPending ||
    submitApprovalMutation.isPending;

  if (isLoading) {
    return (
      <PageMotion className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </PageMotion>
    );
  }

  if (isError || !opname) {
    return (
      <PageMotion className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{tCommon("error")}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tCommon("back")}
        </Button>
      </PageMotion>
    );
  }

  const isDraft = opname.status === "draft";
  const isPendingApproval = opname.status === "pending_approval" || opname.status === "pending";
  const isApproved = opname.status === "approved";

  return (
    <PageMotion className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="cursor-pointer shrink-0"
            onClick={() => router.push("/stock/opname")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {opname.opname_number}
              </h1>
              <StockOpnameStatusBadge status={opname.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {opname.warehouse_name} &middot; {formatDate(opname.date)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && canUpdate && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("pending_approval")}
              disabled={isActionPending}
              className="cursor-pointer"
            >
              <Send className="h-4 w-4 mr-2" />
              {t("actions.submit")}
            </Button>
          )}
          {isPendingApproval && canApprove && (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusChange("rejected")}
                disabled={isActionPending}
                className="cursor-pointer text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {t("actions.reject")}
              </Button>
              <Button
                onClick={() => handleStatusChange("approved")}
                disabled={isActionPending}
                className="cursor-pointer"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("actions.approve")}
              </Button>
            </>
          )}
          {isApproved && canPost && (
            <Button
              onClick={() => handleStatusChange("completed")}
              disabled={isActionPending}
              className="cursor-pointer"
            >
              <Archive className="h-4 w-4 mr-2" />
              {t("actions.post")}
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("detail.totalItems")}</p>
          <p className="text-2xl font-bold">{opname.total_items}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("detail.totalVariance")}</p>
          <p className="text-2xl font-bold">{opname.total_variance_qty}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("detail.shrinkage")}</p>
          <p className="text-2xl font-bold text-destructive">
            {opname.total_negative_variance_qty !== 0 ? opname.total_negative_variance_qty : "-"}
          </p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("detail.overstock")}</p>
          <p className="text-2xl font-bold text-green-600">
            {opname.total_positive_variance_qty !== 0 ? `+${opname.total_positive_variance_qty}` : "-"}
          </p>
        </div>
      </div>

      {/* Employee Assignment */}
      {(opname.ordered_by_name || opname.assigned_to_name) && (
        <div className="flex flex-wrap gap-4">
          {opname.ordered_by_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{t("employee.orderedBy")}:</span>
              <span>{opname.ordered_by_name}</span>
            </div>
          )}
          {opname.assigned_to_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">{t("employee.assignedTo")}:</span>
              <span>{opname.assigned_to_name}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content — role-based */}
      {isManagerView ? (
        <StockOpnameManagerView ref={draftActionsRef} opname={opname} canEditDraft={canUpdate} />
      ) : (
        <StockOpnameCounterView ref={draftActionsRef} opname={opname} readOnly={!canUpdate || opname.status !== "draft"} />
      )}
    </PageMotion>
  );
}
