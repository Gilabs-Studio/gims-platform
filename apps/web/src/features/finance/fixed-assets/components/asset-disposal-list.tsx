"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { DisposalPreviewResponse } from "../types";
import { useTranslations } from "next-intl";

interface AssetDisposalListProps {
  disposals: DisposalPreviewResponse[];
  isLoading: boolean;
}

export function AssetDisposalList({ disposals, isLoading }: AssetDisposalListProps) {
  const t = useTranslations("financeFixedAssets.disposal");

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
        <CardTitle>{t("assetDisposals")}</CardTitle>
        <CardDescription>{disposals.length} {t("totalDisposals")}</CardDescription>
      </CardHeader>
      <CardContent>
        {disposals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t("noDisposals")}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("assetId")}</TableHead>
                  <TableHead className="text-right">{t("bookValue")}</TableHead>
                  <TableHead className="text-right">{t("proceeds")}</TableHead>
                  <TableHead className="text-right">{t("gainLoss")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disposals.map((disposal, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{disposal.asset_id}</TableCell>
                    <TableCell className="text-right">
                      {(disposal.book_value || 0).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {(disposal.proceeds_amount || 0).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {(disposal.gain_loss_amount || 0).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t("completed")}
                      </span>
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
