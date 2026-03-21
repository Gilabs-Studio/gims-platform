"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRightLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  History,
  ListTodo,
  Mail,
  MapPin,
  Navigation,
  Package,
  Pencil,
  Phone,
  Target,
  Trash2,
  User,
  XCircle,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";
import { MapView } from "@/components/ui/map/map-view";
import { Marker, Popup } from "react-leaflet";
import { formatCurrency, formatDate, formatWhatsAppLink, cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { useLeadById, useDeleteLead, useUpdateLead, useLeadFormData, useLeadProductItems } from "../hooks/use-leads";
import { useActivityTypes } from "@/features/crm/activity-type/hooks/use-activity-type";
import { LeadFormDialog } from "./lead-form-dialog";
import { LeadConvertDialog } from "./lead-convert-dialog";
import { LogActivityDialog } from "@/features/crm/activity/components/log-activity-dialog";
import { LogVisitDialog } from "@/features/crm/visit-report/components/log-visit-dialog";
import { useVisitReportFormData } from "@/features/crm/visit-report/hooks/use-visit-reports";
import type { VisitInterestQuestion } from "@/features/crm/visit-report/types";
import { TaskEmbedList } from "@/features/crm/task/components/task-embed-list";
import { TaskFormDialog } from "@/features/crm/task/components/task-form-dialog";
import { useTasksByLead } from "@/features/crm/task/hooks/use-tasks";
import { LeadActivityFeed } from "./lead-activity-feed";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { PageMotion } from "@/components/motion";
import { toast } from "sonner";
import { useState } from "react";
import type { Lead, LeadStatusOption } from "../types";
import type { PaymentTermsFormOption } from "@/features/master-data/customer/types";
import { useProduct } from "@/features/master-data/product/hooks/use-products";
import { ProductDetailDialog } from "@/features/master-data/product/components/product/product-detail-dialog";

interface LeadDetailProps {
  leadId: string;
}

// Fallback ordering for well-known status codes when the API doesn't supply an order field
const STATUS_ORDER_FALLBACK: Record<string, number> = {
  new: 1,
  contacted: 2,
  qualified: 3,
  converted: 4,
  lost: 5,
};

function getSortOrder(status: LeadStatusOption): number {
  if (status.order != null) return status.order;
  return STATUS_ORDER_FALLBACK[status.code?.toLowerCase() ?? ""] ?? 99;
}

// Conversion readiness checklist — shows which customer fields are populated
interface CheckField {
  key: string;
  label: string;
  filled: boolean;
  required?: boolean;
}

function ConversionReadiness({ fields }: { fields: CheckField[] }) {
  const filledCount = fields.filter((f) => f.filled).length;
  const percent = Math.round((filledCount / fields.length) * 100);
  const missingRequired = fields.filter((f) => f.required && !f.filled);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              percent >= 80 ? "bg-success" : percent >= 50 ? "bg-warning" : "bg-destructive/70"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {filledCount}/{fields.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center gap-1.5">
            {field.filled ? (
              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
            ) : (
              <XCircle
                className={cn(
                  "h-3 w-3 shrink-0",
                  field.required ? "text-destructive" : "text-muted-foreground/40"
                )}
              />
            )}
            <span
              className={cn(
                "text-xs truncate",
                field.filled
                  ? "text-foreground"
                  : field.required
                  ? "text-destructive"
                  : "text-muted-foreground/60"
              )}
            >
              {field.label}
              {field.required && !field.filled && (
                <span className="text-destructive ml-0.5">*</span>
              )}
            </span>
          </div>
        ))}
      </div>
      {missingRequired.length > 0 && (
        <p className="text-xs text-destructive">
          Required: {missingRequired.map((f) => f.label).join(", ")}
        </p>
      )}
    </div>
  );
}


function LeadDetailSkeleton() {
  return (
    <PageMotion>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
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
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-4">
                <Skeleton className="h-4 w-32" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageMotion>
  );
}

export function LeadDetail({ leadId }: LeadDetailProps) {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data: response, isLoading, isError, refetch } = useLeadById(leadId);
  const { data: formDataRes } = useLeadFormData();
  const authUser = useAuthStore((state) => state.user);
  const deleteMutation = useDeleteLead();
  const updateMutation = useUpdateLead();

  const canUpdate = useUserPermission("crm_lead.update");
  const canDelete = useUserPermission("crm_lead.delete");
  const canConvert = useUserPermission("crm_lead.convert");
  const canCreateActivity = useUserPermission("crm_activity.create");
  const canCreateVisit = useUserPermission("crm_visit.create");
  const canCreateTask = useUserPermission("crm_task.create");
  const canViewProduct = useUserPermission("product.read");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("activities");
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const isActivitiesTabActive = activeTab === "activities";
  const isTasksTabActive = activeTab === "tasks";
  const isProductItemsTabActive = activeTab === "productItems";
  const { data: activityTypesData } = useActivityTypes(
    { per_page: 20, sort_by: "order", sort_dir: "asc" },
    { enabled: showActivityDialog }
  );
  const activityTypes = activityTypesData?.data?.filter((at) => at.is_active) ?? [];

  const { data: tasksData, isLoading: isTasksLoading } = useTasksByLead(leadId, undefined, {
    enabled: isTasksTabActive,
  });
  const { data: productItemsData, isLoading: isProductItemsLoading } = useLeadProductItems(leadId, {
    enabled: isProductItemsTabActive,
  });
  const selectedProductQuery = useProduct(selectedProductId ?? "", { enabled: !!selectedProductId });
  // Fetch interest questions for resolving survey answers in the product tooltip
  const { data: visitFormDataRes } = useVisitReportFormData({ enabled: isProductItemsTabActive });
  const interestQuestions: VisitInterestQuestion[] = visitFormDataRes?.data?.interest_questions ?? [];

  /** Resolves raw { question_id, option_id }[] JSON to display-friendly text array */
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

  const lead: Lead | undefined = response?.data;
  const statuses = formDataRes?.data?.lead_statuses ?? [];
  const isConverted = !!lead?.converted_at;
  const paymentTermsList: PaymentTermsFormOption[] = formDataRes?.data?.payment_terms ?? [];
  const paymentTerm = paymentTermsList.find((p: PaymentTermsFormOption) => String(p.id) === String(lead?.payment_terms_id));

  const handleDelete = async () => {
    if (!lead) return;
    try {
      await deleteMutation.mutateAsync(lead.id);
      toast.success(t("deleted"));
      router.push("/crm/leads");
    } catch {
      toast.error(tCommon("error"));
    }
    setShowDeleteDialog(false);
  };

  const handleStatusChange = async (statusId: string) => {
    if (!lead) return;
    try {
      await updateMutation.mutateAsync({ id: lead.id, data: { lead_status_id: statusId } });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleLocationSave = async (lat: number, lng: number) => {
    if (!lead) return;
    try {
      await updateMutation.mutateAsync({ id: lead.id, data: { latitude: lat, longitude: lng } });
      toast.success(t("locationUpdated"));
      // Ensure detail view reflects updated coords immediately
      await refetch();
      setShowMapPicker(false);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  if (isLoading) {
    return <LeadDetailSkeleton />;
  }

  if (isError || !lead) {
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

  const statusColor = lead.lead_status?.color ?? undefined;
  const bantCount = [
    lead.budget_confirmed,
    lead.auth_confirmed,
    lead.need_confirmed,
    lead.time_confirmed,
  ].filter(Boolean).length;
  const scoreColor =
    lead.lead_score >= 70
      ? "text-success"
      : lead.lead_score >= 40
      ? "text-warning"
      : "text-muted-foreground";

  // Sorted statuses for stepper and next-step detection
  const sortedStatuses = [...statuses].sort((a, b) => getSortOrder(a) - getSortOrder(b));
  const currentStatusIndex = sortedStatuses.findIndex((s) => s.id === lead.lead_status_id);
  const nextStatus =
    currentStatusIndex >= 0 && currentStatusIndex < sortedStatuses.length - 1
      ? sortedStatuses[currentStatusIndex + 1]
      : null;
  const lostStatus = sortedStatuses.find(
    (s) => s.code?.toLowerCase() === "lost" || s.name?.toLowerCase() === "lost"
  );
  // "Converted" status must not be reachable via the quick-action button
  // (it is exclusively set through the dedicated Convert workflow)
  const convertedStatus = sortedStatuses.find((s) => s.is_converted);

  const hasCoordinates = lead.latitude != null && lead.longitude != null;

  // Fields checked for customer conversion completeness
  const conversionFields: CheckField[] = [
    { key: "name", label: "Name", filled: !!(lead.first_name || lead.company_name), required: true },
    { key: "email", label: "Email", filled: !!lead.email, required: true },
    { key: "phone", label: "Phone", filled: !!lead.phone },
    { key: "company", label: "Company", filled: !!lead.company_name },
    { key: "address", label: "Address", filled: !!lead.address },
    { key: "city", label: "City", filled: !!lead.city },
    { key: "province", label: "Province", filled: !!(lead.province || lead.province_id) },
    { key: "district", label: "District", filled: !!lead.district_id },
    { key: "npwp", label: "NPWP", filled: !!lead.npwp },
    { key: "coords", label: "Location", filled: hasCoordinates },
  ];

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer mt-0.5 shrink-0"
              onClick={() => router.push("/crm/leads")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">
                  {lead.first_name} {lead.last_name}
                </h1>
                {lead.lead_status && (
                  <Badge
                    variant="outline"
                    style={statusColor ? { borderColor: statusColor, color: statusColor } : undefined}
                    className={isConverted && lead.deal_id ? "cursor-pointer hover:border-primary hover:text-primary transition-colors" : ""}
                    onClick={
                      isConverted && lead.deal_id
                        ? () => router.push(`/crm/pipeline/${lead.deal_id}`)
                        : undefined
                    }
                  >
                    {lead.lead_status.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{lead.code}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Quick "next status" button styled with the next status's color */}
            {canUpdate && !isConverted && nextStatus && nextStatus.id !== lostStatus?.id && nextStatus.id !== convertedStatus?.id && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={updateMutation.isPending}
                onClick={() => handleStatusChange(nextStatus.id)}
                style={{
                  borderColor: nextStatus.color || undefined,
                  color: nextStatus.color || undefined,
                }}
              >
                <ChevronRight className="h-3.5 w-3.5 mr-1" />
                {nextStatus.name}
              </Button>
            )}

            {/* Mark as Lost */}
            {canUpdate &&
              !isConverted &&
              lostStatus &&
              lead.lead_status_id !== lostStatus.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-destructive border-destructive/40 hover:bg-destructive/10"
                  disabled={updateMutation.isPending}
                  onClick={() => handleStatusChange(lostStatus.id)}
                >
                  {t("lostBadge")}
                </Button>
              )}

            {canConvert && !isConverted && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setShowConvertDialog(true)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-1" />
                {t("convertTitle")}
              </Button>
            )}
            {canUpdate && !isConverted && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {tCommon("edit")}
              </Button>
            )}
            {canDelete && !isConverted && (
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
            <p className="text-xs text-muted-foreground">{t("table.score")}</p>
            <p className={`text-2xl font-bold ${scoreColor}`}>{lead.lead_score}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("form.probability")}</p>
            <p className="text-2xl font-bold">{lead.probability}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("table.value")}</p>
            <p className="text-lg font-semibold">
              {lead.estimated_value ? formatCurrency(lead.estimated_value) : "-"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("sections.bant")}</p>
            <p className="text-2xl font-bold">{bantCount}/4</p>
          </div>
        </div>

        {/* Two-column layout: left (Notes + Tabs) | right (sidebar) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ── Left column (col-span-2): Notes always at top + Tabs ── */}
          <div className="md:col-span-2 space-y-4">
            {/* Notes — always visible at the top of the left column */}
            {lead.notes && (
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("sections.notes")}
                </h3>
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}

            {/* Tabs: Activities | Tasks | Information */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="activities" className="cursor-pointer gap-1.5">
                  <History className="h-4 w-4" />
                  {t("tabs.activities")}
                  {(lead.activities?.length ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {lead.activities!.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="cursor-pointer gap-1.5">
                  <ListTodo className="h-4 w-4" />
                  {t("tabs.tasks")}
                  {(tasksData?.data?.length ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {tasksData!.data!.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="productItems" className="cursor-pointer gap-1.5">
                  <Package className="h-4 w-4" />
                  {t("tabs.productItems")}
                  {(productItemsData?.data?.filter(i => !i.is_deleted).length ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {productItemsData!.data!.filter(i => !i.is_deleted).length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="information" className="cursor-pointer">
                  {t("tabs.information")}
                </TabsTrigger>
              </TabsList>

              {/* ── Activities Tab ── */}
              <TabsContent value="activities" className="mt-4">
                <LeadActivityFeed
                  leadId={lead.id}
                  enabled={isActivitiesTabActive}
                  canCreateActivity={canCreateActivity}
                  canCreateVisit={canCreateVisit}
                  onLogActivity={() => setShowActivityDialog(true)}
                  onLogVisit={() => setShowVisitDialog(true)}
                  refreshKey={activityRefreshKey}
                />
              </TabsContent>

              {/* ── Tasks Tab ── */}
              <TabsContent value="tasks" className="mt-4">
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
              </TabsContent>

              {/* ── Product Items Tab ── */}
              <TabsContent value="productItems" className="mt-4">
                {isProductItemsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded" />
                    ))}
                  </div>
                ) : (productItemsData?.data?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">{t("productItems.empty")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("productItems.emptyHint")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">{t("productItems.product")}</th>
                          <th className="px-3 py-2 text-left font-medium">{t("productItems.sku")}</th>
                          <th className="px-3 py-2 text-center font-medium">{t("productItems.interest")}</th>
                          <th className="px-3 py-2 text-center font-medium">{t("productItems.qty")}</th>
                          <th className="px-3 py-2 text-right font-medium">{t("productItems.unitPrice")}</th>
                          <th className="px-3 py-2 text-left font-medium">{t("productItems.notes")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productItemsData!.data!.map((item) => (
                          <tr
                              key={item.id}
                              className={`${item.is_deleted ? "" : "border-t"} ${item.is_deleted ? "opacity-50 bg-muted/30" : ""}`}
                            >
                            <td className="px-3 py-2 font-medium relative">
                              {item.is_deleted && (
                                <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                  <div className="border-t border-muted-foreground/50" />
                                </div>
                              )}
                              <span className={item.is_deleted ? "text-muted-foreground" : ""}>
                                {canViewProduct && item.product_id && !item.is_deleted ? (
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
                            <td className={`px-3 py-2 text-muted-foreground relative`}>
                              {item.is_deleted && (
                                <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                  <div className="border-t border-muted-foreground/50" />
                                </div>
                              )}
                              {item.product_sku || "-"}
                            </td>
                            <td className="px-3 py-2 text-center relative">
                              {item.is_deleted && (
                                <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                  <div className="border-t border-muted-foreground/50" />
                                </div>
                              )}
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`cursor-help select-none ${item.is_deleted ? "text-muted-foreground" : "text-warning"}`}>
                                    {"★".repeat(item.interest_level)}{"☆".repeat(Math.max(0, 5 - item.interest_level))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[260px] p-2">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-xs">{t("productItems.interest")}: {item.interest_level}/5</p>
                                    {item.notes && (
                                      <p className="text-xs text-muted-foreground italic border-t pt-1">{item.notes}</p>
                                    )}
                                    {(() => {
                                      const resolved = resolveLastSurveyAnswers(item.last_survey_answers);
                                      if (!resolved.length) return null;
                                      return (
                                        <ul className="space-y-1 border-t pt-1">
                                          {resolved.map((sa, i) => (
                                            <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-x-2 items-start">
                                              <span className="text-muted-foreground">{sa.question_text}</span>
                                              <span className="font-medium text-right whitespace-nowrap">
                                                {sa.option_text}
                                                {sa.score !== 0 && (
                                                  <span className="ml-1 text-warning">({sa.score})</span>
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
                            <td className={`px-3 py-2 text-center relative ${item.is_deleted ? "text-muted-foreground" : ""}`}>
                              {item.is_deleted && (
                                <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                  <div className="border-t border-muted-foreground/50" />
                                </div>
                              )}
                              {item.quantity}
                            </td>
                            <td className={`px-3 py-2 text-right relative ${item.is_deleted ? "text-muted-foreground" : ""}`}>
                              {item.is_deleted && (
                                <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                  <div className="border-t border-muted-foreground/50" />
                                </div>
                              )}
                              {item.unit_price > 0 ? formatCurrency(item.unit_price) : "-"}
                            </td>
                            <td className={`px-3 py-2 text-muted-foreground relative`}>
                              {item.is_deleted && (
                                <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                  <div className="border-t border-muted-foreground/50" />
                                </div>
                              )}
                              {item.notes || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* ── Information Tab (other info) ── */}
              <TabsContent value="information" className="mt-4 space-y-4">

                {/* Classification */}
                <div className="rounded-lg border p-3 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("sections.classification")}
                  </h4>
                  {lead.lead_source && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t("form.leadSource")}</p>
                      <p className="text-sm font-medium">{lead.lead_source.name}</p>
                    </div>
                  )}
                  {lead.place_id && lead.place_id.startsWith("http") && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t("form.sourceLink")}</p>
                      <Link
                        href={lead.place_id}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-1 text-sm font-medium text-primary hover:underline cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {lead.place_id.includes("linkedin.com") ? "View LinkedIn Profile" : "View on Google Maps"}
                        </span>
                      </Link>
                    </div>
                  )}
                  {lead.business_type && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t("form.businessType")}</p>
                      <p className="text-sm font-medium">{lead.business_type?.name ?? lead.business_type}</p>
                    </div>
                  )}

                  {lead.payment_terms_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t("form.paymentTerms")}</p>
                      <p className="text-sm font-medium">{paymentTerm?.name ?? lead.payment_terms_id}</p>
                    </div>
                  )}
                </div>

                {/* Scoring */}
                <div className="rounded-lg border p-3 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("sections.scoring")}
                  </h4>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("table.score")}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(lead.lead_score, 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium">{lead.lead_score}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("form.probability")}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary/70 transition-all" style={{ width: `${Math.min(lead.probability, 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium">{lead.probability}%</span>
                    </div>
                  </div>
                </div>

                {/* Conversion Readiness */}
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      {t("sections.conversionReadiness")}
                    </h4>
                    {!isConverted && canConvert && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer h-7 text-xs"
                        onClick={() => setShowConvertDialog(true)}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                        {t("convertTitle")}
                      </Button>
                    )}
                  </div>
                  <ConversionReadiness fields={conversionFields} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Right column: Customer, Contact, Assignment, BANT, Conversion, Dates ── */}
              <div className="space-y-4">
                {/* Customer (Potential) */}
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("sections.customer")}
                  </h4>
                  {lead.company_name ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{lead.company_name}</span>
                      </div>
                      {lead.job_title && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {lead.job_title}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                  {!lead.customer_id && (
                    <Badge variant="outline" className="text-xs text-warning border-amber-600/40">
                      {t("potentialCustomer")}
                    </Badge>
                  )}
                  {lead.customer_id && lead.customer && (
                    <Link
                      href={`/customers/${lead.customer_id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {lead.customer.name}
                    </Link>
                  )}
                </div>

                {/* Contact */}
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("sections.contactInfo")}
                  </h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {lead.first_name} {lead.last_name}
                    </span>
                  </div>
                  <div className="gap-2">
                    <div className="space-y-2">
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                          <Phone className="h-3 w-3" />
                          <a href={formatWhatsAppLink(lead.phone)} target="_blank" rel="noopener noreferrer">
                            {lead.phone}
                          </a>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                          <Mail className="h-3 w-3" />
                          <a href={`mailto:${lead.email}`}>{lead.email}</a>
                        </div>
                      )}
                      {lead.website && (
                        <div className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                          <ExternalLink className="h-3 w-3" />
                          <Link
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t("form.visitLink")}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Location (moved to sidebar) */}
                  {(lead.latitude != null || lead.longitude != null || lead.address) && (
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                          <MapPin className="h-4 w-4 inline-block mr-1" />
                          {t("sections.location")}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs cursor-pointer"
                          onClick={() => setShowMapPicker(true)}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          {lead.latitude != null ? t("updateLocation") : t("setLocation")}
                        </Button>
                      </div>
                      {lead.latitude != null && lead.longitude != null ? (
                        <div
                          role="button"
                          tabIndex={0}
                          className="w-full h-48 rounded-md border overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group relative"
                          onClick={() => setShowMapPicker(true)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setShowMapPicker(true);
                            }
                          }}
                          title={t("clickToUpdateLocation")}
                        >
                          <MapView
                            className="h-full w-full"
                            defaultZoom={9}
                            markers={[{
                              id: lead.id,
                              latitude: Number(lead.latitude),
                              longitude: Number(lead.longitude),
                              data: lead,
                            }]}
                            renderMarkers={(markers) => (
                              <>
                                {markers.map((m) => (
                                  <Marker key={m.id} position={[m.latitude, m.longitude]}>
                                    <Popup>
                                      <div className="text-sm font-medium">
                                        {lead.company_name ? lead.company_name : `${lead.first_name} ${lead.last_name}`}
                                      </div>
                                    </Popup>
                                  </Marker>
                                ))}
                              </>
                            )}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                            <Badge variant="secondary" className="text-xs shadow">
                              <MapPin className="h-3 w-3 mr-1" />
                              {t("clickToUpdateLocation")}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="w-full h-28 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 rounded-md gap-2 border border-dashed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setShowMapPicker(true)}
                        >
                          <MapPin className="h-6 w-6 text-muted-foreground/40" />
                          <p className="text-xs text-muted-foreground">{t("noLocation")}</p>
                          <p className="text-xs text-primary">{t("setLocation")}</p>
                        </button>
                      )}
                      <div className="text-xs space-y-1">
                        {lead.address && <p className="text-muted-foreground">{lead.address}</p>}
                        {(lead.city || lead.province) && (
                          <p className="text-muted-foreground">{[lead.city, lead.province].filter(Boolean).join(", ")}</p>
                        )}
                        {lead.latitude != null && lead.longitude != null && (
                          <a
                            href={`https://maps.google.com/?q=${lead.latitude},${lead.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                          >
                            <Navigation className="h-3 w-3" />
                            {t("openInMaps")}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assignment */}
                  {lead.assigned_employee && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("sections.assignment")}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(lead.assigned_employee.employee_code)}`}
                          alt={lead.assigned_employee.name}
                        />
                        <AvatarFallback dataSeed={lead.assigned_employee.employee_code} className="text-xs">
                          {lead.assigned_employee.name}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{lead.assigned_employee.name}</span>
                    </div>
                  </div>
                )}

                {/* BANT Qualification */}
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("sections.bant")}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${lead.budget_confirmed ? "bg-success" : "bg-mutedgray"}`} />
                        <span className="font-medium text-muted-foreground uppercase">Budget</span>
                      </div>
                      {lead.budget_amount > 0 && (
                        <p className="pl-3.5 font-medium">{formatCurrency(lead.budget_amount)}</p>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${lead.auth_confirmed ? "bg-success" : "bg-mutedgray"}`} />
                        <span className="font-medium text-muted-foreground uppercase">Authority</span>
                      </div>
                      {lead.auth_person && (
                        <p className="pl-3.5 text-muted-foreground">{lead.auth_person}</p>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${lead.need_confirmed ? "bg-success" : "bg-mutedgray"}`} />
                        <span className="font-medium text-muted-foreground uppercase">Need</span>
                      </div>
                      {lead.need_description && (
                        <p className="pl-3.5 text-muted-foreground whitespace-pre-wrap">{lead.need_description}</p>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${lead.time_confirmed ? "bg-success" : "bg-mutedgray"}`} />
                        <span className="font-medium text-muted-foreground uppercase">Timeline</span>
                      </div>
                      {lead.time_expected && (
                        <p className="pl-3.5 text-muted-foreground">{formatDate(lead.time_expected)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conversion details (only when converted) */}
                {isConverted && (
                  <div className="rounded-lg border p-3 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("sections.conversion")}
                    </h4>
                    {lead.converted_at && (
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(lead.converted_at)}</span>
                      </div>
                    )}
                    {lead.deal_id && (
                      <Link
                        href={`/crm/pipeline/${lead.deal_id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {lead.deal?.code ?? lead.deal?.title ?? "Deal"}
                      </Link>
                    )}
                    {lead.customer_id && lead.customer && (
                      <Link
                        href={`/customers/${lead.customer_id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {lead.customer.name}
                      </Link>
                    )}
                  </div>
                )}

                {/* Dates */}
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("sections.dates")}
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{t("table.createdAt")}:</span>
                    <span className="font-medium">{formatDate(lead.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{t("updatedAt")}:</span>
                    <span className="font-medium">{formatDate(lead.updated_at)}</span>
                  </div>
                </div>
              </div>
        </div>
      </div>

      {/* Dialogs */}
      {canUpdate && (
        <LeadFormDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          lead={lead}
        />
      )}

      {canConvert && lead && !isConverted && (
        <LeadConvertDialog
          open={showConvertDialog}
          onClose={() => setShowConvertDialog(false)}
          lead={lead}
        />
      )}

      {canCreateActivity && (
        <LogActivityDialog
          open={showActivityDialog}
          onClose={() => setShowActivityDialog(false)}
          leadId={lead.id}
          defaultEmployeeId={authUser?.employee_id || lead.assigned_employee?.id}
          employees={formDataRes?.data?.employees ?? []}
          activityTypes={activityTypes}
          onSuccess={() => {
            refetch();
            setActivityRefreshKey((k) => k + 1);
          }}
        />
      )}

      {canCreateVisit && (
        <LogVisitDialog
          open={showVisitDialog}
          onClose={() => setShowVisitDialog(false)}
          leadId={lead.id}
          customerId={lead.customer_id ?? undefined}
          contactId={lead.contact_id ?? undefined}
          defaultEmployeeId={authUser?.employee_id || lead.assigned_employee?.id}
          defaultContactPerson={`${lead.first_name} ${lead.last_name}`.trim() || undefined}
          defaultContactPhone={lead.phone || undefined}
          onSuccess={() => {
            refetch();
            setActivityRefreshKey((k) => k + 1);
          }}
        />
      )}

      <TaskFormDialog
        open={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        defaultLeadId={lead.id}
        defaultAssignedToId={authUser?.employee_id || lead.assigned_employee?.id}
        onSuccess={() => setShowTaskDialog(false)}
      />

      {canDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? tCommon("deleting") : tCommon("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Map picker modal for setting / updating coordinates */}
      <MapPickerModal
        open={showMapPicker}
        onOpenChange={setShowMapPicker}
        latitude={lead.latitude ?? 0}
        longitude={lead.longitude ?? 0}
        onCoordinateSelect={handleLocationSave}
        title={t("pickLocation")}
        description={t("pickLocationDesc")}
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
