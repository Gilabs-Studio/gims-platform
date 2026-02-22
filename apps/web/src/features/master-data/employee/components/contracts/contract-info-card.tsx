"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeContract, ContractStatus } from "../../types";
import {
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  RefreshCw,
  Edit,
  X,
  AlertTriangle,
} from "lucide-react";
import { getDisplayFilename } from "@/components/ui/file-upload";

interface ContractInfoCardProps {
  contract: EmployeeContract | null | undefined;
  onCreate?: () => void;
  onEdit?: () => void;
  onTerminate?: () => void;
  onRenew?: () => void;
  onCorrect?: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canTerminate?: boolean;
  canRenew?: boolean;
  canCorrect?: boolean;
}

export function ContractInfoCard({
  contract,
  onCreate,
  onEdit,
  onTerminate,
  onRenew,
  onCorrect,
  canCreate = false,
  canEdit = false,
  canTerminate = false,
  canRenew = false,
  canCorrect = false,
}: ContractInfoCardProps) {
  const t = useTranslations("employee");

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("contract.statuses.ACTIVE")}
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("contract.statuses.EXPIRED")}
          </Badge>
        );
      case "TERMINATED":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            {t("contract.statuses.TERMINATED")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP");
  };

  // No active contract
  if (!contract) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("contract.sections.activeContract")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              {t("contract.empty.noActive")}
            </p>
            {canCreate && onCreate && (
              <Button onClick={onCreate}>
                <FileText className="h-4 w-4 mr-2" />
                {t("contract.actions.create")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has active contract
  return (
    <Card
      className={contract.is_expiring_soon ? "border-amber-500/50" : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("contract.sections.activeContract")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge(contract.status)}
            {contract.is_expiring_soon && (
              <Badge
                variant="outline"
                className="border-amber-500 text-amber-600"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t("contract.expiringInDays", {
                  days: contract.days_until_expiry ?? 0,
                })}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("contract.fields.contractNumber")}
            </p>
            <p className="font-medium">{contract.contract_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {t("contract.fields.contractType")}
            </p>
            <p className="font-medium">
              {t(`contract.types.${contract.contract_type}`)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {t("contract.fields.startDate")}
            </p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(contract.start_date)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {t("contract.fields.endDate")}
            </p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {contract.end_date ? formatDate(contract.end_date) : "-"}
            </p>
          </div>
        </div>

        {/* Document */}
        {contract.document_path && (
          <div className="pt-3 border-t">
            <Button variant="outline" size="sm" asChild>
              <a
                href={contract.document_path}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4 mr-2" />
                {getDisplayFilename(contract.document_path) || t("contract.actions.download")}
              </a>
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t">
          {canRenew && onRenew && (
            <Button variant="outline" size="sm" onClick={onRenew}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("contract.actions.renew")}
            </Button>
          )}
          {canEdit && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {t("contract.actions.edit")}
            </Button>
          )}
          {canCorrect && onCorrect && (
            <Button variant="outline" size="sm" onClick={onCorrect}>
              <AlertCircle className="h-4 w-4 mr-2" />
              {t("contract.actions.correct")}
            </Button>
          )}
          {canTerminate && onTerminate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTerminate}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-2" />
              {t("contract.actions.terminate")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
