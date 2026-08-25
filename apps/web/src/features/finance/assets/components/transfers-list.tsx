"use client";

import { useTranslations } from "next-intl";
import { Table, TableBody, TableHeader, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTransfers, useApproveTransfer, useRejectTransfer } from "../hooks/use-transfers";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useHasPermission, usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import type { TransferListItem } from "../types";

type Props = { assetId: string };

export function TransfersList({ assetId }: Props) {
  const t = useTranslations("financeAssets");
  const { user } = useAuthStore();
  const canApprove = useHasPermission("asset.transfer.approve");
  const readScope = usePermissionScope("asset.transfer.approve");

  // Build params respecting permission scope and tenant isolation
  const params: Record<string, unknown> = { asset_id: assetId };
  if (user?.tenant_id) params.tenant_id = user.tenant_id;
  if (readScope === "OWN") {
    if (user?.employee_id) params.requested_by = user.employee_id;
  }

  const { data, isLoading } = useTransfers(params, { enabled: !!assetId });
  const approveMutation = useApproveTransfer();
  const rejectMutation = useRejectTransfer();

  const items = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t("detail.noTransfers")}
      </div>
    );
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "active" | "inactive" | "soft" | "dot" => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "transfer_requested":
      case "requested":
        return "warning";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Divisions</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead className="w-[180px]">Effective Date</TableHead>
            <TableHead className="flex-1">Notes</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((transfer: TransferListItem) => (
            <TableRow key={transfer.id}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="font-medium text-sm">{transfer.divisions_name ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">{transfer.divisions_code ?? ""}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(transfer.status)}>
                  {t(`status.${transfer.status}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm font-medium">
                {transfer.requested_by_name ?? "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(transfer.effective_date ?? transfer.requested_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                {transfer.notes ?? transfer.reason ?? "-"}
              </TableCell>
              <TableCell>
                {canApprove && transfer.status !== "approved" && transfer.status !== "rejected" && (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approveMutation.mutate(transfer.id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {t("actions.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        rejectMutation.mutate({
                          id: transfer.id,
                          reason: "Rejected via UI",
                        })
                      }
                      disabled={rejectMutation.isPending}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {t("actions.reject")}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
