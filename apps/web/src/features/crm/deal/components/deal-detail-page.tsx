"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  History,
  ListTodo,
  Mail,
  MapPin,
  Navigation,
  Package,
  Pencil,
  Phone,
  ReceiptText,
  Trash2,
  User,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { useDealById, useDeleteDeal, useDealFormData } from "../hooks/use-deals";
import { useLeadById, useUpdateLead, useLeadProductItems } from "@/features/crm/lead/hooks/use-leads";
import { useVisitReportFormData } from "@/features/crm/visit-report/hooks/use-visit-reports";
import type { VisitInterestQuestion } from "@/features/crm/visit-report/types";
import { DealFormDialog } from "./deal-form-dialog";
import { MoveStageDialog } from "./move-stage-dialog";
import { DealHistoryTimeline } from "./deal-history-timeline";
import { ConvertToQuotationDialog } from "./convert-to-quotation-dialog";
import { DealStockCheck } from "./deal-stock-check";
import { DealActivityFeed } from "./deal-activity-feed";
import { LogActivityDialog } from "@/features/crm/activity/components/log-activity-dialog";
import { LogVisitDialog } from "@/features/crm/visit-report/components/log-visit-dialog";
import { TaskEmbedList } from "@/features/crm/task/components/task-embed-list";
import { TaskFormDialog } from "@/features/crm/task/components/task-form-dialog";
import { useTasksByDeal } from "@/features/crm/task/hooks/use-tasks";
import { useActivityTypes } from "@/features/crm/activity-type/hooks/use-activity-type";
import { useDealActivityTimeline } from "@/features/crm/activity/hooks/use-activities";
import { MapView } from "@/components/ui/map/map-view";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";
import { Marker, Popup } from "react-leaflet";
import { useUserPermission } from "@/hooks/use-user-permission";
import { ProductDetailDialog } from "@/features/master-data/product/components/product/product-detail-dialog";
import { PageMotion } from "@/components/motion";
import { toast } from "sonner";
import type { Deal } from "../types";
import type { LeadProductItem } from "@/features/crm/lead/types";
import { useProduct } from "@/features/master-data/product/hooks/use-products";

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
  const { data: formDataRes } = useDealFormData();
  const { data: activityTypesData } = useActivityTypes({ per_page: 100, sort_by: "order", sort_dir: "asc" });
  const activityTypes = activityTypesData?.data?.filter((at) => at.is_active) ?? [];
  const employees = formDataRes?.employees ?? [];

  const canUpdate = useUserPermission("crm_deal.update");
  const canDelete = useUserPermission("crm_deal.delete");
  const canMoveStage = useUserPermission("crm_deal.move_stage");
  const canConvert = useUserPermission("sales_quotation.create");
  const canCreateVisit = useUserPermission("crm_visit.create");
  const canCreateTask = useUserPermission("crm_task.create");
  const canViewProduct = useUserPermission("product.read");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMoveStage, setShowMoveStage] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(["activities"]));

  const { data: tasksData, isLoading: isTasksLoading } = useTasksByDeal(dealId);
  const deal: Deal | undefined = response?.data;
  const { totalCount: activitiesCount } = useDealActivityTimeline(dealId, deal?.lead_id ?? undefined);
  const updateLeadMutation = useUpdateLead();
  // Fetch the lead's current product items for live interest levels, deleted state, and survey answers
  const { data: leadProductItemsData } = useLeadProductItems(deal?.lead_id ?? "", { enabled: !!deal?.lead_id });
  const { data: visitFormDataRes } = useVisitReportFormData({ enabled: !!deal?.lead_id });
  const interestQuestions: VisitInterestQuestion[] = visitFormDataRes?.data?.interest_questions ?? [];

  const leadItems = (leadProductItemsData?.data ?? []).filter((p) => p.product_id);
  const leadInterestMap = new Map<string, number>(leadItems.map((p) => [p.product_id!, p.interest_level]));
  const leadDeletedSet = new Set<string>(leadItems.filter((p) => p.is_deleted).map((p) => p.product_id!));
  const leadItemByProductId = new Map<string, LeadProductItem>(leadItems.map((p) => [p.product_id!, p]));

  function resolveLastSurveyAnswers(raw: string | null | undefined) {
    if (!raw) return [];
    try {
      const parsed: { question_id: string; option_id: string }[] = JSON.parse(raw);
      return parsed.flatMap((ans) => {
        const q = interestQuestions.find((q) => q.id === ans.question_id);
        const opt = q?.options.find((o) => o.id === ans.option_id);
        if (!q || !opt) return [];
        return [{ question_text: q.question_text, option_text: opt.option_text, score: opt.score }];
      });
    } catch {
      return [];
    }
  }

  const selectedProductQuery = useProduct(selectedProductId ?? "", { enabled: !!selectedProductId });

  const { data: leadResponse } = useLeadById(deal?.lead_id ?? "");
  const visitReportUrl =
    deal?.visit_report ??
    deal?.lead?.visit_report ??
    leadResponse?.data?.website ??
    deal?.lead?.website ??
    deal?.website;

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

  const handleLocationSave = useCallback(async (lat: number, lng: number) => {
    if (!deal?.lead_id) return;
    try {
      await updateLeadMutation.mutateAsync({ id: deal.lead_id, data: { latitude: lat, longitude: lng } });
      toast.success(t("locationUpdated"));
      await refetch();
      setShowMapPicker(false);
    } catch {
      toast.error(tCommon("error"));
    }
  }, [deal, updateLeadMutation, t, tCommon, refetch]);

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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-sm text-muted-foreground">{deal.code}</p>
                {deal.lead_id && deal.lead && (
                  <Link
                    href={`/crm/leads/${deal.lead_id}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {deal.lead.code ?? `${deal.lead.first_name} ${deal.lead.last_name}`}
                  </Link>
                )}
              </div>
              {/* Quotation / customer conversion links */}
              {(deal.converted_to_quotation_id || deal.customer_id) && (
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
                  {deal.converted_to_quotation_id && (
                    <Link
                      href={`/sales/quotations/${deal.converted_to_quotation_id}`}
                      className="flex items-center gap-1 text-primary hover:underline cursor-pointer transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {t("conversion.viewQuotation")}
                    </Link>
                  )}
                  {deal.customer_id && deal.customer && (
                    <Link
                      href={`/customers/${deal.customer_id}`}
                      className="flex items-center gap-1 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {deal.customer.name}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Convert to Quotation — show for won deals not yet converted; disable if no permission */}
            {deal.status === "won" && !deal.converted_to_quotation_id && (
              <Button
                variant="default"
                size="sm"
                className="cursor-pointer"
                onClick={() => setShowConvertDialog(true)}
                disabled={!canConvert}
                title={!canConvert ? t("conversion.permissionRequired") : undefined}
              >
                <ReceiptText className="h-4 w-4 mr-1" />
                {t("conversion.convertToQuotation")}
              </Button>
            )}
            {canMoveStage && isOpen && !deal.converted_to_quotation_id && (
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
          <div className="md:col-span-2 space-y-4">
            {/* Description */}
            {deal.description && (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold mb-2">{t("description")}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {deal.description}
                </p>
              </div>
            )}

            {/* Notes */}
            {deal.notes && (
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("notes")}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {deal.notes}
                </p>
              </div>
            )}

            {/* Tabs: Activities / Product Items / Information */}
            <Tabs
              defaultValue="activities"
              onValueChange={(v) => setVisitedTabs((prev) => new Set([...prev, v]))}
            >
              <TabsList>
                <TabsTrigger value="activities" className="cursor-pointer gap-1.5">
                  <History className="h-4 w-4" />
                  {t("activities")}
                  {activitiesCount > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {activitiesCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="cursor-pointer gap-1.5">
                  <ListTodo className="h-4 w-4" />
                  {t("tasks")}
                  {(tasksData?.data?.length ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {tasksData!.data!.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="items" className="cursor-pointer gap-1.5">
                  <Package className="h-4 w-4" />
                  {t("productItems")}
                  {(deal.items?.filter(i => !i.is_deleted && !(i.product_id && leadDeletedSet.has(i.product_id))).length ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {deal.items!.filter(i => !i.is_deleted && !(i.product_id && leadDeletedSet.has(i.product_id))).length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="information" className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-1" />
                  {t("information")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activities" className="mt-3">
                {visitedTabs.has("activities") && (
                  <DealActivityFeed
                    dealId={deal.id}
                    leadId={deal.lead_id ?? undefined}
                    canCreateActivity={true}
                    canCreateVisit={canCreateVisit}
                    onLogActivity={() => setShowActivityDialog(true)}
                    onLogVisit={() => setShowVisitDialog(true)}
                  />
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-3">
                {visitedTabs.has("tasks") && (
                  <>
                    {canCreateTask && (
                      <div className="flex justify-end mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => setShowTaskDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          {t("createTask")}
                        </Button>
                      </div>
                    )}
                    <TaskEmbedList
                      tasks={tasksData?.data ?? []}
                      isLoading={isTasksLoading}
                      emptyMessage={t("noTasks")}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="items" className="mt-3">
                {visitedTabs.has("items") && (
                  <>
                    {!deal.items || deal.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {t("noItems")}
                      </p>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="px-3 py-2 text-left font-medium">{t("product")}</th>
                                <th className="px-3 py-2 text-left font-medium">{t("sku")}</th>
                                <th className="px-3 py-2 text-center font-medium">{t("interest")}</th>
                                <th className="px-3 py-2 text-center font-medium">{t("qty")}</th>
                                <th className="px-3 py-2 text-right font-medium">{t("unitPrice")}</th>
                                <th className="px-3 py-2 text-right font-medium">{t("subtotal")}</th>
                                <th className="px-3 py-2 text-left font-medium">{t("itemNotes")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deal.items.map((item) => {
                                const isEffectivelyDeleted = item.is_deleted || (item.product_id ? leadDeletedSet.has(item.product_id) : false);
                                const interestLevel = item.product_id
                                  ? (leadInterestMap.get(item.product_id) ?? item.interest_level ?? 0)
                                  : (item.interest_level ?? 0);
                                const leadItem = item.product_id ? leadItemByProductId.get(item.product_id) : undefined;
                                return (
                                  <tr
                                    key={item.id}
                                    className={`${isEffectivelyDeleted ? "" : "border-t"} ${isEffectivelyDeleted ? "opacity-50 bg-muted/30" : ""}`}
                                  >
                                    <td className="px-3 py-2 font-medium relative">
                                      {isEffectivelyDeleted && (
                                        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                          <div className="border-t border-muted-foreground/50" />
                                        </div>
                                      )}
                                      <span className={isEffectivelyDeleted ? "text-muted-foreground" : ""}>
                                        {canViewProduct && item.product_id && !isEffectivelyDeleted ? (
                                          <button
                                            type="button"
                                            className="text-left hover:underline text-primary cursor-pointer"
                                            onClick={() => setSelectedProductId(item.product_id ?? null)}
                                          >
                                            {item.product_name}
                                          </button>
                                        ) : (
                                          item.product_name
                                        )}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground relative">
                                      {isEffectivelyDeleted && (
                                        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                          <div className="border-t border-muted-foreground/50" />
                                        </div>
                                      )}
                                      {item.product_sku || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-center relative">
                                      {isEffectivelyDeleted && (
                                        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                          <div className="border-t border-muted-foreground/50" />
                                        </div>
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className={`cursor-help select-none ${isEffectivelyDeleted ? "text-muted-foreground" : "text-amber-500"}`}>
                                            {"★".repeat(interestLevel)}{"☆".repeat(Math.max(0, 5 - interestLevel))}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[260px] p-2">
                                          <div className="space-y-1">
                                            <p className="font-semibold text-xs">{t("interest")}: {interestLevel}/5</p>
                                            {leadItem?.notes && (
                                              <p className="text-xs text-muted-foreground italic border-t pt-1">{leadItem.notes}</p>
                                            )}
                                            {(() => {
                                              const resolved = resolveLastSurveyAnswers(leadItem?.last_survey_answers);
                                              if (!resolved.length) return null;
                                              return (
                                                <ul className="space-y-1 border-t pt-1">
                                                  {resolved.map((sa, i) => (
                                                    <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-x-2 items-start">
                                                      <span className="text-muted-foreground">{sa.question_text}</span>
                                                      <span className="font-medium text-right whitespace-nowrap">
                                                        {sa.option_text}
                                                        {sa.score !== 0 && (
                                                          <span className="ml-1 text-amber-500">({sa.score})</span>
                                                        )}
                                                      </span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              );
                                            })()}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </td>
                                    <td className={`px-3 py-2 text-center relative ${isEffectivelyDeleted ? "text-muted-foreground" : ""}`}>
                                      {isEffectivelyDeleted && (
                                        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                          <div className="border-t border-muted-foreground/50" />
                                        </div>
                                      )}
                                      {item.quantity}
                                    </td>
                                    <td className={`px-3 py-2 text-right relative ${isEffectivelyDeleted ? "text-muted-foreground" : ""}`}>
                                      {isEffectivelyDeleted && (
                                        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                          <div className="border-t border-muted-foreground/50" />
                                        </div>
                                      )}
                                      {item.unit_price > 0 ? formatCurrency(item.unit_price) : "-"}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-medium relative ${isEffectivelyDeleted ? "text-muted-foreground" : ""}`}>
                                      {isEffectivelyDeleted && (
                                        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                          <div className="border-t border-muted-foreground/50" />
                                        </div>
                                      )}
                                      {formatCurrency(item.subtotal)}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground relative">
                                      {isEffectivelyDeleted && (
                                        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                          <div className="border-t border-muted-foreground/50" />
                                        </div>
                                      )}
                                      {item.notes || "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Total as a separate element outside the table: show products total vs BANT budget */}
                        <div className="flex justify-end items-center gap-6 mt-2 px-3 py-2.5 rounded-lg border bg-muted/30">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-muted-foreground">{t("productsTotal")}</div>
                            <div className="text-sm font-semibold">{formatCurrency(
                              (deal.items ?? [])
                                .filter((i) => !(i.is_deleted || (i.product_id ? leadDeletedSet.has(i.product_id) : false)))
                                .reduce((s, it) => s + (it.subtotal ?? 0), 0)
                            )}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold text-muted-foreground">{t("bantBudget")}</div>
                            <div className="text-sm font-semibold">{deal.budget_amount > 0 ? formatCurrency(deal.budget_amount) : "-"}</div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Stock availability check for deal items */}
                    {deal.items && deal.items.filter(i => !i.is_deleted && !(i.product_id && leadDeletedSet.has(i.product_id))).length > 0 && (
                      <div className="mt-4">
                        <DealStockCheck dealId={deal.id} />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="information" className="mt-3">
                {visitedTabs.has("information") && (
                  <div className="space-y-4">
                    {/* Location / Map from lead - moved to sidebar */}

                    {/* BANT Details */}
                    <div className="rounded-lg border p-4 space-y-3">
                      <h4 className="text-sm font-semibold">{t("bantTitle")}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${deal.budget_confirmed ? "bg-green-500" : "bg-gray-300"}`} />
                            <span className="text-xs font-medium text-muted-foreground uppercase">{t("budget")}</span>
                          </div>
                          {deal.budget_amount > 0 && (
                            <p className="text-sm font-medium pl-3.5">{formatCurrency(deal.budget_amount)}</p>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${deal.auth_confirmed ? "bg-green-500" : "bg-gray-300"}`} />
                            <span className="text-xs font-medium text-muted-foreground uppercase">{t("authority")}</span>
                          </div>
                          {deal.auth_person && (
                            <p className="text-sm pl-3.5">{deal.auth_person}</p>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${deal.need_confirmed ? "bg-green-500" : "bg-gray-300"}`} />
                            <span className="text-xs font-medium text-muted-foreground uppercase">{t("need")}</span>
                          </div>
                          {deal.need_description && (
                            <p className="text-sm pl-3.5 text-muted-foreground whitespace-pre-wrap">{deal.need_description}</p>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${deal.time_confirmed ? "bg-green-500" : "bg-gray-300"}`} />
                            <span className="text-xs font-medium text-muted-foreground uppercase">{t("timeline")}</span>
                          </div>
                          {deal.expected_close_date && (
                            <p className="text-sm pl-3.5">{formatDate(deal.expected_close_date)}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stage Transition History */}
                    <div className="rounded-lg border p-4">
                      <h4 className="text-sm font-semibold mb-3">{t("history")}</h4>
                      <DealHistoryTimeline dealId={deal.id} />
                    </div>

                    {/* Close reason when deal is closed */}
                    {deal.close_reason && (
                      <div className="rounded-lg border p-4 space-y-1">
                        <h4 className="text-sm font-semibold">{t("closeReason")}</h4>
                        <p className="text-sm text-muted-foreground">{deal.close_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            {/* Customer — show actual customer OR potential from lead company */}
            {(deal.customer || deal.lead?.company_name) && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("customer")}
                  </h4>
                  {!deal.customer && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-600/40">
                      {t("potential")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {deal.customer?.name ?? deal.lead!.company_name}
                  </span>
                </div>
                {deal.customer && deal.customer_id ? (
                  <Link
                    href={`/customers/${deal.customer_id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {deal.customer.code}
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t("fromLead")}</p>
                )}
              </div>
            )}

            {/* Contact */}
            {(deal.contact || (deal.lead && (deal.lead.phone || deal.lead.email))) && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("contact")}
                </h4>
                {deal.contact ? (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{deal.contact.name}</span>
                    </div>
                    {deal.contact.phone && (
                      <a
                        href={`https://wa.me/${deal.contact.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <Phone className="h-3 w-3" />
                        {deal.contact.phone}
                      </a>
                    )}
                    {deal.contact.email && (
                      <a
                        href={`mailto:${deal.contact.email}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <Mail className="h-3 w-3" />
                        {deal.contact.email}
                      </a>
                    )}
                    {visitReportUrl && (
                      <a
                        href={visitReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("visitReport")}
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {deal.lead!.first_name} {deal.lead!.last_name}
                      </span>
                    </div>
                    {deal.lead!.phone && (
                      <a
                        href={`https://wa.me/${deal.lead!.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <Phone className="h-3 w-3" />
                        {deal.lead!.phone}
                      </a>
                    )}
                    {deal.lead!.email && (
                      <a
                        href={`mailto:${deal.lead!.email}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <Mail className="h-3 w-3" />
                        {deal.lead!.email}
                      </a>
                    )}
                    {visitReportUrl && (
                      <a
                        href={visitReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("visitReport")}
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground/70 italic">{t("fromLead")}</p>
                  </>
                )}
              </div>
            )}

            {/* Location (moved to sidebar) */}
            {deal.lead_id && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    <MapPin className="h-4 w-4 inline-block mr-1" />
                    {t("location")}
                  </h4>
                  {canUpdate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs cursor-pointer"
                      onClick={() => setShowMapPicker(true)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {deal.lead?.latitude != null ? t("updateLocation") : t("setLocation")}
                    </Button>
                  )}
                </div>
                {deal.lead?.latitude != null && deal.lead?.longitude != null ? (
                  <div className="w-full h-64 rounded-md border overflow-hidden">
                    <MapView
                      className="h-full"
                      defaultZoom={9}
                      markers={[{
                        id: deal.lead.id,
                        latitude: Number(deal.lead.latitude),
                        longitude: Number(deal.lead.longitude),
                        data: deal.lead,
                      }]}
                      renderMarkers={(markers) =>
                        markers.map((m) => (
                          <Marker key={m.id} position={[m.latitude, m.longitude]}>
                            <Popup>
                              {deal.lead!.company_name || `${deal.lead!.first_name} ${deal.lead!.last_name}`}
                            </Popup>
                          </Marker>
                        ))
                      }
                    />
                  </div>
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center bg-muted/30 rounded-md gap-2 border border-dashed">
                    <MapPin className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">{t("noLocation")}</p>
                  </div>
                )}
                {deal.lead && (
                  <div className="text-xs space-y-1">
                    {deal.lead.address && <p className="text-muted-foreground">{deal.lead.address}</p>}
                    {(deal.lead.city || deal.lead.province) && (
                      <p className="text-muted-foreground">{[deal.lead.city, deal.lead.province].filter(Boolean).join(", ")}</p>
                    )}
                    {deal.lead.latitude != null && deal.lead.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${deal.lead.latitude},${deal.lead.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <Navigation className="h-3 w-3" />
                        {t("openInMaps")}
                      </a>
                    )}
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
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(deal.assigned_employee.employee_code)}`}
                      alt={deal.assigned_employee.name}
                    />
                    <AvatarFallback dataSeed={deal.assigned_employee.employee_code} className="text-xs">{deal.assigned_employee.name}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{deal.assigned_employee.name}</span>
                </div>
              </div>
            )}

            {/* BANT */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                {t("bantTitle")}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${deal.budget_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span className="font-medium text-muted-foreground uppercase">{t("budget")}</span>
                  </div>
                  {deal.budget_amount > 0 && (
                    <p className="pl-3.5 font-medium">{formatCurrency(deal.budget_amount)}</p>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${deal.auth_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span className="font-medium text-muted-foreground uppercase">{t("authority")}</span>
                  </div>
                  {deal.auth_person && (
                    <p className="pl-3.5 text-muted-foreground">{deal.auth_person}</p>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${deal.need_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span className="font-medium text-muted-foreground uppercase">{t("need")}</span>
                  </div>
                  {deal.need_description && (
                    <p className="pl-3.5 text-muted-foreground whitespace-pre-wrap">{deal.need_description}</p>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${deal.time_confirmed ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span className="font-medium text-muted-foreground uppercase">{t("timeline")}</span>
                  </div>
                  {deal.expected_close_date && (
                    <p className="pl-3.5 text-muted-foreground">{formatDate(deal.expected_close_date)}</p>
                  )}
                </div>
              </div>
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

      {/* Convert to Quotation Dialog */}
      {canConvert && deal.status === "won" && !deal.converted_to_quotation_id && (
        <ConvertToQuotationDialog
          deal={deal}
          open={showConvertDialog}
          onOpenChange={setShowConvertDialog}
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

      {/* Log activity dialog */}
      <LogActivityDialog
        open={showActivityDialog}
        onClose={() => setShowActivityDialog(false)}
        dealId={deal.id}
        leadId={deal.lead_id ?? undefined}
        defaultEmployeeId={deal.assigned_employee?.id}
        employees={employees}
        activityTypes={activityTypes}
        onSuccess={() => {
          setShowActivityDialog(false);
          refetch();
        }}
      />

      {/* Task dialog */}
      <TaskFormDialog
        open={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        defaultDealId={deal.id}
        defaultLeadId={deal.lead_id ?? undefined}
        defaultAssignedToId={deal.assigned_employee?.id}
        onSuccess={() => setShowTaskDialog(false)}
      />

      {/* Log visit dialog */}
      {canCreateVisit && (
        <LogVisitDialog
          open={showVisitDialog}
          onClose={() => setShowVisitDialog(false)}
          dealId={deal.id}
          leadId={deal.lead_id ?? undefined}
          customerId={deal.customer_id ?? undefined}
          contactId={deal.contact_id ?? undefined}
          defaultEmployeeId={deal.assigned_employee?.id}
          defaultContactPerson={deal.contact?.name}
          defaultContactPhone={deal.contact?.phone}
          contacts={
            deal.customer_id
              ? (formDataRes?.contacts ?? [])
                  .filter((c) => c.customer_id === deal.customer_id)
                  .map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
              : undefined
          }
          onSuccess={() => {
            setShowVisitDialog(false);
            refetch();
          }}
        />
      )}

      {/* Map picker for updating lead location */}
      <MapPickerModal
        open={showMapPicker}
        onOpenChange={setShowMapPicker}
        latitude={deal.lead?.latitude != null ? Number(deal.lead.latitude) : 0}
        longitude={deal.lead?.longitude != null ? Number(deal.lead.longitude) : 0}
        onCoordinateSelect={handleLocationSave}
      />

      {/* Product detail dialog (RBAC-gated via canViewProduct) */}
      <ProductDetailDialog
        open={!!selectedProductId}
        onOpenChange={(open) => { if (!open) setSelectedProductId(null); }}
        product={selectedProductQuery.data?.data ?? null}
      />
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
        <div className="md:col-span-2 space-y-4">
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
