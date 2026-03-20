"use client";

import { useTranslations } from "next-intl";
import {
  X,
  Wallet,
  PieChart,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

import { useAssetBudget } from "../hooks/use-asset-budgets";
import type { AssetBudget, AssetBudgetStatus } from "../types";

interface BudgetDetailProps {
  budget: AssetBudget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusBadge(status: AssetBudgetStatus) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <Clock className="h-3 w-3 mr-1.5" />
          Draft
        </Badge>
      );
    case "active":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          Aktif
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="outline" className="text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1.5" />
          Ditutup
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1.5" />
          Dibatalkan
        </Badge>
      );
    default:
      return <Badge className="text-xs font-medium">{status}</Badge>;
  }
}

export function BudgetDetail({
  budget,
  open,
  onOpenChange,
}: BudgetDetailProps) {
  const t = useTranslations("assetBudget");
  const { data: detailData, isLoading } = useAssetBudget(budget?.id || "");

  if (!budget) return null;

  const displayBudget = detailData?.data || budget;
  const summary = displayBudget.summary;
  const utilizationPercent = summary?.utilization_rate || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">
                {displayBudget.budget_name}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  {displayBudget.budget_code}
                </Badge>
                {getStatusBadge(displayBudget.status)}
                <span className="text-sm text-muted-foreground">
                  {displayBudget.fiscal_year}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">Informasi</TabsTrigger>
              <TabsTrigger value="categories">Kategori Budget</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 py-4">
              {/* Budget Information Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-48">
                        {t("fields.budgetCode")}
                      </TableCell>
                      <TableCell>{displayBudget.budget_code}</TableCell>
                      <TableCell className="font-medium bg-muted/50 w-48">
                        {t("fields.fiscalYear")}
                      </TableCell>
                      <TableCell>{displayBudget.fiscal_year}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">
                        {t("fields.status")}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(displayBudget.status)}
                      </TableCell>
                      <TableCell className="font-medium bg-muted/50">
                        Periode
                      </TableCell>
                      <TableCell>
                        {displayBudget.start_date} - {displayBudget.end_date}
                      </TableCell>
                    </TableRow>
                    {displayBudget.description && (
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("fields.description")}
                        </TableCell>
                        <TableCell colSpan={3}>
                          {displayBudget.description}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Financial Summary Section */}
              <div>
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">Ringkasan Budget</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      {t("summary.totalAllocated")}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary?.total_allocated || 0)}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      Total Kategori
                    </p>
                    <p className="text-2xl font-bold">
                      {displayBudget.categories.length}
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden mt-4">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("summary.totalUsed")}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(summary?.total_used || 0)}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("summary.totalCommitted")}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(summary?.total_committed || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("summary.totalAvailable")}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(summary?.total_available || 0)}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">
                          {t("summary.utilizationRate")}
                        </TableCell>
                        <TableCell className="text-right">
                          {utilizationPercent.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4">
                  <Progress value={utilizationPercent} className="h-2" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4 py-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <PieChart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">Kategori Budget</h3>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fields.category")}</TableHead>
                      <TableHead className="text-right">
                        {t("fields.allocatedAmount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("fields.usedAmount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("fields.committedAmount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("fields.availableAmount")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayBudget.categories.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {t("messages.noCategories")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayBudget.categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">
                            {category.category_name}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(category.allocated_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(category.used_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(category.committed_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(category.available_amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {displayBudget.categories.some((c) => c.notes) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-3">Catatan</h4>
                    <div className="space-y-2">
                      {displayBudget.categories
                        .filter((c) => c.notes)
                        .map((category) => (
                          <div
                            key={`note-${category.id}`}
                            className="text-sm border-l-2 border-primary/30 pl-3"
                          >
                            <span className="font-medium">
                              {category.category_name}:{" "}
                            </span>
                            <span className="text-muted-foreground">
                              {category.notes}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
