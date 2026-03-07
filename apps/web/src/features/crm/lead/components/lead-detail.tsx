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
  FileText,
  History,
  Mail,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Target,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { getActivityTypeIcon } from "@/features/crm/activity/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useLeadById, useDeleteLead, useUpdateLead, useLeadFormData } from "../hooks/use-leads";
import { LeadFormDialog } from "./lead-form-dialog";
import { LeadConvertDialog } from "./lead-convert-dialog";
import { LogActivityDialog } from "./log-activity-dialog";
import { useUserPermission } from "@/hooks/use-user-permission";
import { PageMotion } from "@/components/motion";
import { toast } from "sonner";
import { useState } from "react";
import type { Lead, LeadStatusOption, ActivityResponse } from "../types";

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

function BANTIndicator({ confirmed, label }: { confirmed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {confirmed ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={`text-sm ${confirmed ? "font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    </div>
  );
}

// Sequential status stepper — each step is clickable to update the lead status
function StatusStepper({
  statuses,
  currentStatusId,
  onStatusChange,
  disabled,
}: {
  statuses: LeadStatusOption[];
  currentStatusId: string | null | undefined;
  onStatusChange: (statusId: string) => void;
  disabled?: boolean;
}) {
  // Exclude the "converted" status — it is set only via the dedicated Convert flow
  const sorted = [...statuses]
    .filter((s) => !s.is_converted)
    .sort((a, b) => getSortOrder(a) - getSortOrder(b));
  const currentIndex = sorted.findIndex((s) => s.id === currentStatusId);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {sorted.map((status, index) => {
        const isCurrent = status.id === currentStatusId;
        const isPast = index < currentIndex;
        const color = status.color || "#6366f1";
        return (
          <div key={status.id} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <button
              onClick={() => !disabled && !isCurrent && onStatusChange(status.id)}
              disabled={disabled || isCurrent}
              title={status.name}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap select-none",
                isCurrent
                  ? "text-white shadow-sm cursor-default"
                  : isPast
                  ? "opacity-60 cursor-pointer hover:opacity-90"
                  : "border cursor-pointer hover:opacity-80",
                disabled && !isCurrent && "cursor-not-allowed opacity-40"
              )}
              style={
                isCurrent
                  ? { backgroundColor: color }
                  : { borderColor: color, color }
              }
            >
              {status.name}
            </button>
          </div>
        );
      })}
    </div>
  );
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
              percent >= 80 ? "bg-green-500" : percent >= 50 ? "bg-yellow-500" : "bg-destructive/70"
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
              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
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
  const deleteMutation = useDeleteLead();
  const updateMutation = useUpdateLead();

  const canUpdate = useUserPermission("crm_lead.update");
  const canDelete = useUserPermission("crm_lead.delete");
  const canConvert = useUserPermission("crm_lead.convert");
  const canCreateActivity = useUserPermission("crm_activity.create");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  const lead: Lead | undefined = response?.data;
  const statuses = formDataRes?.data?.lead_statuses ?? [];
  const isConverted = !!lead?.converted_at;

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
      ? "text-green-600"
      : lead.lead_score >= 40
      ? "text-yellow-600"
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

            {/* Tabs: Activities | Information */}
            <Tabs defaultValue="activities">
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
                <TabsTrigger value="information" className="cursor-pointer">
                  {t("tabs.information")}
                </TabsTrigger>
              </TabsList>

              {/* ── Activities Tab ── */}
              <TabsContent value="activities" className="mt-4">
                <div className="space-y-4">
                  {canCreateActivity && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer h-7 text-xs"
                        onClick={() => setShowActivityDialog(true)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t("addActivity")}
                      </Button>
                    </div>
                  )}

                  {!lead.activities || lead.activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <History className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">{t("noActivities")}</p>
                      {canCreateActivity && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer mt-1"
                          onClick={() => setShowActivityDialog(true)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          {t("addActivity")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <ol className="relative border-l border-border ml-3 space-y-6">
                      {(lead.activities as ActivityResponse[])
                        .slice()
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((activity) => {
                          const TypeIcon = getActivityTypeIcon(activity.activity_type?.icon);
                          return (
                          <li key={activity.id} className="ml-6">
                            <span
                              className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border bg-background"
                              style={
                                activity.activity_type?.badge_color
                                  ? { borderColor: activity.activity_type.badge_color, color: activity.activity_type.badge_color }
                                  : undefined
                              }
                            >
                              <TypeIcon className="h-3 w-3" />
                            </span>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {activity.activity_type && (
                                  <Badge
                                    variant="outline"
                                    className="inline-flex items-center gap-1 text-xs"
                                    style={
                                      activity.activity_type.badge_color
                                        ? { borderColor: activity.activity_type.badge_color, color: activity.activity_type.badge_color }
                                        : undefined
                                    }
                                  >
                                    <TypeIcon className="h-3 w-3 shrink-0" />
                                    {activity.activity_type.name}
                                  </Badge>
                                )}
                                <time className="text-xs text-muted-foreground">
                                  {formatDate(activity.timestamp)}
                                </time>
                                {activity.employee && (
                                  <span className="text-xs text-muted-foreground">
                                    &bull; {activity.employee.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm">{activity.description}</p>
                            </div>
                          </li>
                          );
                        })}
                    </ol>
                  )}
                </div>
              </TabsContent>

              {/* ── Information Tab: Contact, BANT, Conversion Readiness ── */}
              <TabsContent value="information" className="mt-4 space-y-4">
                {/* Contact Information */}
                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("sections.contactInfo")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={Mail} label={t("form.email")} value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
                    <InfoRow icon={Phone} label={t("form.phone")} value={lead.phone} href={lead.phone ? formatWhatsAppLink(lead.phone) : undefined} />
                    <InfoRow icon={MapPin} label={t("form.address")} value={lead.address} />
                    <InfoRow icon={MapPin} label={t("form.city")} value={lead.city} />
                    <InfoRow icon={MapPin} label={t("form.province")} value={lead.province} />
                    <InfoRow icon={FileText} label={t("form.npwp")} value={lead.npwp} />
                  </div>
                </div>

                {/* BANT Qualification */}
                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("sections.bant")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    <div className="space-y-2">
                      <BANTIndicator confirmed={lead.budget_confirmed} label={t("form.budgetConfirmed")} />
                      {lead.budget_confirmed && lead.budget_amount > 0 && (
                        <p className="text-sm text-muted-foreground ml-6">{formatCurrency(lead.budget_amount)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <BANTIndicator confirmed={lead.auth_confirmed} label={t("form.authConfirmed")} />
                      {lead.auth_confirmed && lead.auth_person && (
                        <p className="text-sm text-muted-foreground ml-6">{lead.auth_person}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <BANTIndicator confirmed={lead.need_confirmed} label={t("form.needConfirmed")} />
                      {lead.need_confirmed && lead.need_description && (
                        <p className="text-sm text-muted-foreground ml-6">{lead.need_description}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <BANTIndicator confirmed={lead.time_confirmed} label={t("form.timeConfirmed")} />
                      {lead.time_confirmed && lead.time_expected && (
                        <p className="text-sm text-muted-foreground ml-6">{formatDate(lead.time_expected)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conversion Readiness */}
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Target className="h-4 w-4" />
                      {t("sections.conversionReadiness")}
                    </h3>
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

          {/* ── Right column: Basic Info, Location, Classification, Assignment, Scoring, Conversion, Dates ── */}
              <div className="space-y-4">
                {/* Basic Information (moved to right sidebar) */}
                <div className="rounded-lg border p-3 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("sections.basicInfo")}
                  </h4>
                  <InfoRow icon={User} label={t("form.firstName")} value={lead.first_name} />
                  <InfoRow icon={User} label={t("form.lastName")} value={lead.last_name} />
                  <InfoRow icon={Building2} label={t("form.companyName")} value={lead.company_name} />
                  <InfoRow icon={Briefcase} label={t("form.jobTitle")} value={lead.job_title} />
                </div>

                {/* Location / Map */}
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {t("sections.location")}
                    </h4>
                    {canUpdate && !isConverted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer h-6 px-2 text-xs"
                        onClick={() => setShowMapPicker(true)}
                        disabled={updateMutation.isPending}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        {hasCoordinates ? t("changeLocation") : t("pickLocation")}
                      </Button>
                    )}
                  </div>

                  {hasCoordinates ? (
                    <>
                      <div className="w-full h-48 rounded-md border bg-muted/30 overflow-hidden">
                        <MapView
                          className="h-48"
                          defaultZoom={9}
                          markers={[
                            {
                              id: lead.id,
                              latitude: Number(lead.latitude),
                              longitude: Number(lead.longitude),
                              data: lead,
                            },
                          ]}
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
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-mono tabular-nums">
                          {Number(lead.latitude).toFixed(6)},{" "}
                          {Number(lead.longitude).toFixed(6)}
                        </span>
                        <a
                          href={`https://maps.google.com/?q=${lead.latitude},${lead.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t("openInMaps")}
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="h-28 flex flex-col items-center justify-center bg-muted/30 rounded-md gap-2 border border-dashed">
                      <MapPin className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">{t("noLocation")}</p>
                      {canUpdate && !isConverted && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer text-xs h-7"
                          onClick={() => setShowMapPicker(true)}
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          {t("pickLocation")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

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
                  {lead.lead_status && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t("form.leadStatus")}</p>
                      <Badge
                        variant="outline"
                        style={statusColor ? { borderColor: statusColor, color: statusColor } : undefined}
                      >
                        {lead.lead_status.name}
                      </Badge>
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
                  {lead.website && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t("form.website")}</p>
                      <Link
                        href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-1 text-sm font-medium text-primary hover:underline cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{t("form.visitLink")}</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Assignment */}
                {lead.assigned_employee && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
                    <p className="text-xs text-muted-foreground">{lead.assigned_employee.employee_code}</p>
                  </div>
                )}

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

                {/* Conversion details (only when converted) */}
                {isConverted && (
                  <div className="rounded-lg border p-3 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("sections.conversion")}
                    </h4>
                    {lead.converted_at && (
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(lead.converted_at)}</span>
                      </div>
                    )}
                    {lead.customer && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("form.convertCustomer")}</p>
                        <p className="text-sm font-medium">{lead.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.customer.code}</p>
                      </div>
                    )}
                    {lead.deal_id && (
                      <Link
                        href={`/crm/pipeline/${lead.deal_id}`}
                        className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("viewDeal")}
                      </Link>
                    )}
                  </div>
                )}

                {/* Dates */}
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("table.createdAt")}
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{formatDate(lead.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(lead.updated_at)}</span>
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
          defaultEmployeeId={lead.assigned_employee?.id}
          employees={formDataRes?.data?.employees ?? []}
          onSuccess={() => refetch()}
        />
      )}

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
    </PageMotion>
  );
}
