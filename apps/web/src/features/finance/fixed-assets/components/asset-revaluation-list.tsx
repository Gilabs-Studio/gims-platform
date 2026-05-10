"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock } from "lucide-react";
import type { RevaluationTransaction } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useTranslations } from "next-intl";

interface AssetRevaluationListProps {
  revaluations: RevaluationTransaction[];
  isLoading: boolean;
  isApproving?: boolean;
  onApprove?: (transactionId: string) => Promise<void>;
}

export function AssetRevaluationList({ revaluations, isLoading, isApproving = false, onApprove }: AssetRevaluationListProps) {
  const t = useTranslations("financeFixedAssets.revaluation");
  const canUpdateAsset = useUserPermission("asset.update");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("assetRevaluations")}</CardTitle>
        <CardDescription>{revaluations.length} {t("totalRevaluations")}</CardDescription>
      </CardHeader>
      <CardContent>
        {revaluations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t("noPending")}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("assetRevaluations")}</TableHead>
                  <TableHead>{t("revaluationDelta")}</TableHead>
                  <TableHead>{t("statusLabel")}</TableHead>
                  <TableHead>{t("effectiveDate")}</TableHead>
                  <TableHead>{t("action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revaluations.map((revaluation) => (
                  <TableRow key={revaluation.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{revaluation.asset_name}</p>
                        <p className="text-sm text-muted-foreground">{revaluation.asset_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {revaluation.revaluation_delta.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {revaluation.status === "approved" ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">{t("approved")}</span>
                          </>
                        ) : revaluation.status === "rejected" ? (
                          <>
                            <Clock className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium text-destructive">{t("rejected")}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-600">{t("pending")}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(revaluation.effective_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {(revaluation.status === "draft" || revaluation.status === "pending") && onApprove && canUpdateAsset && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isApproving}
                          className="cursor-pointer"
                          onClick={() => onApprove(revaluation.id)}
                        >
                          {t("approve")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
