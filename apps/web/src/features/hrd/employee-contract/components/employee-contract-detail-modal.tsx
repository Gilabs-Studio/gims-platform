"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  FileText, 
  User, 
  Briefcase,
  Info,
  History,
} from "lucide-react";
import { useEmployeeContract } from "../hooks/use-employee-contracts";
import { useEmployee } from "@/features/master-data/employee/hooks/use-employees";
import { Link } from "@/i18n/routing";

interface EmployeeContractDetailModalProps {
  readonly contractId: string;
  readonly onClose: () => void;
  readonly onEdit?: (contractId: string) => void;
}

export function EmployeeContractDetailModal({
  contractId,
  onClose,
  onEdit,
}: EmployeeContractDetailModalProps) {
  const t = useTranslations("employeeContract");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch contract details
  const { data: contractResponse, isLoading, isError } = useEmployeeContract(contractId);
  const contract = contractResponse?.data;

  // Lazy load employee details only when Employee tab is active
  const { data: employeeResponse, isLoading: isLoadingEmployee } = useEmployee(
    activeTab === "employee" ? contract?.employee_id : undefined
  );
  const employeeDetails = employeeResponse?.data;

  const getStatusBadge = () => {
    if (!contract) return null;
    switch (contract.status) {
      case "ACTIVE":
        return <Badge variant="success">{t("status.ACTIVE")}</Badge>;
      case "EXPIRED":
        return <Badge variant="destructive">{t("status.EXPIRED")}</Badge>;
      case "TERMINATED":
        return <Badge variant="outline">{t("status.TERMINATED")}</Badge>;
      default:
        return <Badge>{contract.status}</Badge>;
    }
  };

  const getTypeBadge = () => {
    if (!contract) return null;
    const variants = {
      PERMANENT: "default",
      CONTRACT: "secondary",
      INTERNSHIP: "outline",
      PROBATION: "info",
    } as const;

    return (
      <Badge variant={variants[contract.contract_type] || "default"}>
        {t(`contractType.${contract.contract_type}`)}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">
                {contract?.contract_number ?? t("titles.detail")}
              </DialogTitle>
              <div className="flex items-center gap-3">
                {contract && getStatusBadge()}
                <span className="text-sm text-muted-foreground">
                  {contract?.start_date && format(new Date(contract.start_date), "dd MMM yyyy")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onEdit && contract && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(contractId)}
                  className="cursor-pointer"
                  title={t("common.edit")}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6 py-4">
            <Skeleton className="h-20 w-full" />
            <Separator />
            <div className="grid grid-cols-2 gap-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : isError || !contract ? (
          <div className="text-center py-12 text-destructive">
            {t("common.error")}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="overview">
                <Info className="h-4 w-4 mr-2" />
                {t("tabs.overview")}
              </TabsTrigger>
              <TabsTrigger value="employee">
                <User className="h-4 w-4 mr-2" />
                {t("tabs.employee")}
              </TabsTrigger>
              <TabsTrigger value="audit">
                <History className="h-4 w-4 mr-2" />
                {t("tabs.audit")}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 py-6">{renderOverviewTab()}</TabsContent>

            {/* Employee Tab */}
            <TabsContent value="employee" className="space-y-6 py-6">{renderEmployeeTab()}</TabsContent>

            {/* Audit Tab */}
            <TabsContent value="audit" className="space-y-6 py-6">{renderAuditTab()}</TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );

  function renderOverviewTab() {
    if (!contract) return null;

    return (
      <>
        {/* Warning Messages */}
        {contract.is_expiring_soon && contract.status === "ACTIVE" && (
          <div className="bg-warning/10 border border-warning rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{t("common.expiringSoon")}</p>
              <p className="text-sm text-muted-foreground">
                {t("messages.contractExpiryWarning", { days: contract.days_until_expiry ?? 0 })}
              </p>
            </div>
          </div>
        )}

        {contract.status === "EXPIRED" && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="font-medium text-destructive">{t("messages.contractExpired")}</p>
          </div>
        )}

        {/* Salary Card - Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-background border border-primary/20 shadow-sm">
          <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
          <div className="relative p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm font-medium uppercase tracking-wide">{t("common.salary")}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">{formatCurrency(contract.salary)}</span>
                  <span className="text-sm text-muted-foreground">/ {t("common.perMonth")}</span>
                </div>
              </div>
              <div className="shrink-0">
                {getTypeBadge()}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Contract Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Job Information */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{t("info.jobInformation")}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("fields.jobTitle")}</p>
                  <p className="font-medium">{contract.job_title}</p>
                </div>
                {contract.department && (
                  <div>
                    <p className="text-muted-foreground">{t("fields.department")}</p>
                    <p>{contract.department}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contract Information */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{t("info.contractInformation")}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("fields.contractNumber")}</p>
                  <p className="font-medium">{contract.contract_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("fields.contractType")}</p>
                  <p>{t(`contractType.${contract.contract_type}`)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("common.status")}</p>
                  {getStatusBadge()}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Contract Period */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{t("info.contractPeriod")}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("fields.startDate")}</p>
                  <p className="font-medium">{format(new Date(contract.start_date), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("fields.endDate")}</p>
                  {contract.end_date ? (
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{format(new Date(contract.end_date), "dd MMM yyyy")}</p>
                      {contract.days_until_expiry !== undefined && contract.days_until_expiry > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {contract.days_until_expiry} {t("common.daysUntilExpiry")}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t("common.noEndDate")}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Document */}
            {contract.document_path && (
              <div>
                <h3 className="font-semibold mb-2">{t("common.document")}</h3>
                <Button variant="outline" size="sm" asChild className="cursor-pointer">
                  <a
                    href={
                      contract.document_path.startsWith("http")
                        ? contract.document_path
                        : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087"}${contract.document_path.startsWith("/") ? contract.document_path : `/${contract.document_path}`}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    download={contract.document_path.split("/").pop() ?? "contract-document.pdf"}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {t("buttons.downloadDocument")}
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Terms & Conditions */}
        {contract.terms && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{t("common.terms")}</h3>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm whitespace-pre-wrap">{contract.terms}</p>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  function renderEmployeeTab() {
    // Show loading while fetching employee details
    if (isLoadingEmployee) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Separator />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      );
    }

    if (!employeeDetails) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          {t("messages.noEmployeeData")}
        </div>
      );
    }

    return (
      <>
        {/* Employee Header Card */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-xl font-semibold">{employeeDetails.name}</h3>
              <p className="text-sm text-muted-foreground">
                {employeeDetails.employee_code}
                {employeeDetails.email && ` • ${employeeDetails.email}`}
              </p>
              {employeeDetails.job_position?.name && (
                <Badge variant="outline">{employeeDetails.job_position.name}</Badge>
              )}
            </div>
            <Link
              href={
                contract?.employee_id
                  ? `/master-data/employees?openId=${contract.employee_id}`
                  : "/master-data/employees"
              }
            >
              <Button variant="outline" size="sm" className="cursor-pointer">
                {t("buttons.viewProfile")}
              </Button>
            </Link>
          </div>
        </div>

        <Separator />

        {/* Employee Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("employee.employeeCode")}</p>
              <p className="font-medium">{employeeDetails.employee_code}</p>
            </div>
            {employeeDetails.email && (
              <div>
                <p className="text-sm text-muted-foreground">{t("employee.email")}</p>
                <p className="font-medium">{employeeDetails.email}</p>
              </div>
            )}
            {employeeDetails.phone && (
              <div>
                <p className="text-sm text-muted-foreground">{t("employee.phone")}</p>
                <p className="font-medium">{employeeDetails.phone}</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {employeeDetails.job_position?.name && (
              <div>
                <p className="text-sm text-muted-foreground">{t("employee.position")}</p>
                <p className="font-medium">{employeeDetails.job_position.name}</p>
              </div>
            )}
            {employeeDetails.division?.name && (
              <div>
                <p className="text-sm text-muted-foreground">{t("employee.department")}</p>
                <p className="font-medium">{employeeDetails.division.name}</p>
              </div>
            )}
            {employeeDetails.contract_start_date && (
              <div>
                <p className="text-sm text-muted-foreground">{t("employee.hireDate")}</p>
                <p className="font-medium">{format(new Date(employeeDetails.contract_start_date), "dd MMM yyyy")}</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  function renderAuditTab() {
    if (!contract) return null;

    return (
      <div className="space-y-6">
        {/* Timeline */}
        <div className="relative space-y-6">
          {/* Created */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-primary/10 p-2">
                <History className="h-4 w-4 text-primary" />
              </div>
              <div className="w-px h-full bg-border mt-2" />
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{t("info.created")}</h4>
                <Badge variant="outline" className="text-xs">
                  {format(new Date(contract.created_at), "dd MMM yyyy")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {format(new Date(contract.created_at), "HH:mm:ss")}
              </p>
              {contract.created_by_user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{contract.created_by_user.name}</span>
                  {contract.created_by_user.email && (
                    <span className="text-muted-foreground">• {contract.created_by_user.email}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-primary/10 p-2">
                <History className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{t("info.lastUpdated")}</h4>
                <Badge variant="outline" className="text-xs">
                  {format(new Date(contract.updated_at), "dd MMM yyyy")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {format(new Date(contract.updated_at), "HH:mm:ss")}
              </p>
              {contract.updated_by_user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{contract.updated_by_user.name}</span>
                  {contract.updated_by_user.email && (
                    <span className="text-muted-foreground">• {contract.updated_by_user.email}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
