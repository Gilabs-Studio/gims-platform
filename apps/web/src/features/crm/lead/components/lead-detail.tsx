"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Calendar,
  DollarSign,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User,
  Briefcase,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { useLeadById, useDeleteLead } from "../hooks/use-leads";
import { LeadFormDialog } from "./lead-form-dialog";
import { LeadConvertDialog } from "./lead-convert-dialog";
import { useUserPermission } from "@/hooks/use-user-permission";
import { PageMotion } from "@/components/motion";
import { toast } from "sonner";
import { useState } from "react";
import type { Lead } from "../types";

interface LeadDetailProps {
  leadId: string;
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

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export function LeadDetail({ leadId }: LeadDetailProps) {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data: response, isLoading, isError, refetch } = useLeadById(leadId);
  const deleteMutation = useDeleteLead();

  const canUpdate = useUserPermission("crm_lead.update");
  const canDelete = useUserPermission("crm_lead.delete");
  const canConvert = useUserPermission("crm_lead.convert");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const lead: Lead | undefined = response?.data;
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
  const bantCount = [lead.budget_confirmed, lead.auth_confirmed, lead.need_confirmed, lead.time_confirmed]
    .filter(Boolean).length;
  const scoreColor = lead.lead_score >= 70 ? "text-green-600" : lead.lead_score >= 40 ? "text-yellow-600" : "text-muted-foreground";

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
              onClick={() => router.push("/crm/leads")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {lead.first_name} {lead.last_name}
                </h1>
                <Badge
                  variant={isConverted ? "default" : "outline"}
                  style={statusColor ? { borderColor: statusColor, color: statusColor } : undefined}
                >
                  {lead.lead_status?.name ?? "-"}
                </Badge>
                {isConverted && (
                  <Badge variant="default">{t("convertedBadge")}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{lead.code}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

        {/* Main content: two columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: main info */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                {t("sections.basicInfo")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={User} label={t("form.firstName")} value={lead.first_name} />
                <InfoRow icon={User} label={t("form.lastName")} value={lead.last_name} />
                <InfoRow icon={Building2} label={t("form.companyName")} value={lead.company_name} />
                <InfoRow icon={Briefcase} label={t("form.jobTitle")} value={lead.job_title} />
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                {t("sections.contactInfo")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Mail} label={t("form.email")} value={lead.email} />
                <InfoRow icon={Phone} label={t("form.phone")} value={lead.phone} />
                <InfoRow icon={MapPin} label={t("form.address")} value={lead.address} />
                <InfoRow icon={MapPin} label={t("form.city")} value={lead.city} />
                <InfoRow icon={MapPin} label={t("form.province")} value={lead.province} />
              </div>
            </div>

            {/* BANT Qualification */}
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                {t("sections.bant")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                <div className="space-y-2">
                  <BANTIndicator confirmed={lead.budget_confirmed} label={t("form.budgetConfirmed")} />
                  {lead.budget_confirmed && lead.budget_amount > 0 && (
                    <p className="text-sm text-muted-foreground ml-6">
                      {formatCurrency(lead.budget_amount)}
                    </p>
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
                    <p className="text-sm text-muted-foreground ml-6">
                      {formatDate(lead.time_expected)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  {t("sections.notes")}
                </h3>
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            {/* Classification */}
            <div className="rounded-lg border p-3 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
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
            </div>

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
                    <AvatarFallback dataSeed={lead.assigned_employee.employee_code} className="text-xs">{lead.assigned_employee.name}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{lead.assigned_employee.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lead.assigned_employee.employee_code}
                </p>
              </div>
            )}

            {/* Scoring */}
            <div className="rounded-lg border p-3 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                {t("sections.scoring")}
              </h4>
              <div>
                <p className="text-xs text-muted-foreground">{t("table.score")}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(lead.lead_score, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{lead.lead_score}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("form.probability")}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary/70 transition-all"
                      style={{ width: `${Math.min(lead.probability, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{lead.probability}%</span>
                </div>
              </div>
            </div>

            {/* Conversion (if converted) */}
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
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
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
    </PageMotion>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
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
        <div className="md:col-span-2 space-y-6">
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
  );
}
