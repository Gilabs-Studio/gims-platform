"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmployeeContract, ContractStatus } from "../../types";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
} from "lucide-react";
import { getDisplayFilename } from "@/components/ui/file-upload";
import { resolveImageUrl } from "@/lib/utils";

interface ContractTimelineProps {
  contracts: EmployeeContract[];
}

export function ContractTimeline({ contracts }: ContractTimelineProps) {
  const t = useTranslations("employee");

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-success";
      case "EXPIRED":
        return "bg-mutedgray";
      case "TERMINATED":
        return "bg-destructive";
      default:
        return "bg-mutedgray";
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-success/15 text-success border-emerald-500/20">
            {t("contract.statuses.ACTIVE")}
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="secondary">{t("contract.statuses.EXPIRED")}</Badge>
        );
      case "TERMINATED":
        return (
          <Badge variant="destructive">
            {t("contract.statuses.TERMINATED")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: ContractStatus) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-5 w-5 text-white" />;
      case "EXPIRED":
        return <Clock className="h-5 w-5 text-white" />;
      case "TERMINATED":
        return <XCircle className="h-5 w-5 text-white" />;
      default:
        return <FileText className="h-5 w-5 text-white" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP");
  };

  // Sort contracts by start date (newest first)
  const sortedContracts = [...contracts].sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
  );

  if (sortedContracts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("contract.empty.noHistory")}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-6">
          {sortedContracts.map((contract, index) => (
            <div key={contract.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${getStatusColor(
                  contract.status,
                )} flex items-center justify-center shadow-md`}
              >
                {getStatusIcon(contract.status)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="bg-card border rounded-lg p-4 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-semibold text-base">
                        {contract.contract_number}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t(`contract.types.${contract.contract_type}`)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(contract.status)}
                      {contract.is_expiring_soon && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-warning" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {t("contract.expiringSoon", {
                                days: contract.days_until_expiry ?? 0,
                              })}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t("contract.fields.startDate")}:{" "}
                      </span>
                      <span className="font-medium">
                        {formatDate(contract.start_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("contract.fields.endDate")}:{" "}
                      </span>
                      <span className="font-medium">
                        {contract.end_date
                          ? formatDate(contract.end_date)
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Additional info */}
                  {(contract.termination_reason ||
                    contract.termination_notes) && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-md text-sm">
                      {contract.termination_reason && (
                        <p>
                          <span className="text-muted-foreground">
                            {t("contract.fields.terminationReason")}:{" "}
                          </span>
                          <span className="font-medium">
                            {t(
                              `contract.terminationReasons.${contract.termination_reason}`,
                            )}
                          </span>
                        </p>
                      )}
                      {contract.termination_notes && (
                        <p className="mt-1 text-muted-foreground">
                          {contract.termination_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Document info */}
                  {contract.document_path && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {t("contract.fields.document")}:{" "}
                      </span>
                      <a
                        href={resolveImageUrl(contract.document_path) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary hover:underline cursor-pointer font-medium"
                      >
                        <Download className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[300px]">
                          {getDisplayFilename(contract.document_path) ||
                            contract.document_name ||
                            t("contract.documentUploaded")}
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
