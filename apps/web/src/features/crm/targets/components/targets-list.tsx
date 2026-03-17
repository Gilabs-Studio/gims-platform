"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { 
  MoreHorizontal,
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Eye, 
  Target, 
  TrendingUp, 
  BarChart3,
  ArrowUpRight
} from "lucide-react";
import { useYearlyTargets, useDeleteYearlyTarget } from "../hooks/use-targets";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { TargetForm } from "./target-form";
import { TargetDetailModal } from "./target-detail-modal";
import type { YearlyTarget } from "../types";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function TargetsList() {
  const t = useTranslations("targets");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<YearlyTarget | null>(null);
  const [viewingTarget, setViewingTarget] = useState<YearlyTarget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useYearlyTargets({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
  });

  const canCreate = useUserPermission("sales_target.create");
  const canUpdate = useUserPermission("sales_target.update");
  const canDelete = useUserPermission("sales_target.delete");
  const canView = useUserPermission("sales_target.read");

  const deleteTarget = useDeleteYearlyTarget();
  const targets = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (target: YearlyTarget) => {
    setEditingTarget(target);
    setIsFormOpen(true);
  };

  const handleView = (target: YearlyTarget) => {
    setViewingTarget(target);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteTarget.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTarget(null);
  };

  // Helper calculation functions
  const calculateProgress = (actual: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.min(100, Math.max(0, (actual / target) * 100));
  };
  
  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-purple";
    if (percent >= 80) return "bg-success";
    if (percent >= 50) return "bg-warning";
    return "bg-destructive";
  };

  // Overall stats
  const overallStats = {
     totalTarget: targets.reduce((acc, curr) => acc + curr.total_target, 0),
     totalActual: targets.reduce((acc, curr) => acc + curr.total_actual, 0),
  };
  const overallProgress = calculateProgress(overallStats.totalActual, overallStats.totalTarget);

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}: {(error as Error)?.message}
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i).reverse();

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
             <Select
              value={yearFilter}
              onValueChange={(v) => {
                setYearFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] bg-background">
                <SelectValue placeholder={t("year")} />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canCreate && (
                <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                {t("add")}
              </Button>
            )}
        </div>
      </div>

       {/* Dashboard Summary Cards - Google Style */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-border/50 bg-card/50">
             <CardContent className="p-4">
                <div className="flex items-center justify-between space-y-0 pb-2">
                   <span className="text-sm font-medium text-muted-foreground">{t("totalTarget")}</span>
                   <Target className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(overallStats.totalTarget)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                   {t("common.filterBy")} {t("year")} {yearFilter}
                </p>
             </CardContent>
          </Card>
          
          <Card className="shadow-sm border-border/50 bg-card/50">
             <CardContent className="p-4">
                <div className="flex items-center justify-between space-y-0 pb-2">
                   <span className="text-sm font-medium text-muted-foreground">{t("totalActual")}</span>
                   <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(overallStats.totalActual)}</div>
                <div className="flex items-center text-xs mt-1">
                  <span className={cn("font-medium", overallProgress >= 100 ? "text-success" : "text-muted-foreground")}>
                      {overallProgress.toFixed(1)}% 
                  </span>
                  <span className="text-muted-foreground ml-1">{t("ofAnnualGoal")}</span>
                </div>
             </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 bg-card/50">
             <CardContent className="p-4">
                <div className="flex items-center justify-between space-y-0 pb-2">
                   <span className="text-sm font-medium text-muted-foreground">{t("achievementSummary")}</span>
                   <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                   <div className="text-2xl font-bold">{overallProgress.toFixed(0)}%</div>
                   <div className="mb-1">
                      {overallProgress >= 100 ? (
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("common.remaining")}</span>
                      )}
                   </div>
                </div>
                <Progress value={overallProgress} className="h-1.5 mt-3" indicatorClassName={getProgressColor(overallProgress)} />
             </CardContent>
          </Card>
       </div>

      {/* Main Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder={t("search")}
                 value={search}
                 onChange={(e) => {
                   setSearch(e.target.value);
                   setPage(1);
                 }}
                 className="pl-9 bg-background"
               />
            </div>
        </div>

        <div className="rounded-md border shadow-sm bg-card">
          <Table>
             <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                   <TableHead className="w-[100px]">{t("year")}</TableHead>
                   <TableHead>{t("areaRegion")}</TableHead>
                   <TableHead className="w-[250px] text-center">{t("progress")}</TableHead>
                   <TableHead className="text-right">{t("targetVsActual")}</TableHead>
                   <TableHead className="w-[70px]"></TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
                {isLoading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                         <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                         <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                         <TableCell><div className="h-2 w-full bg-muted animate-pulse rounded" /></TableCell>
                         <TableCell className="text-right"><div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                         <TableCell />
                      </TableRow>
                   ))
                ) : targets.length === 0 ? (
                   <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                         <div className="flex flex-col items-center gap-2">
                            <Target className="h-8 w-8 text-muted-foreground/30" />
                            <p>{t("notFound")}</p>
                         </div>
                      </TableCell>
                   </TableRow>
                ) : (
                   targets.map((target) => {
                      const progress = calculateProgress(target.total_actual, target.total_target);
                      
                      return (
                         <TableRow 
                           key={target.id} 
                           className="cursor-pointer hover:bg-muted/30 transition-colors"
                           onClick={() => canView && handleView(target)}
                         >
                            <TableCell className="font-medium text-muted-foreground">{target.year}</TableCell>
                            <TableCell>
                               <span className="font-medium text-foreground">{target.area?.name}</span>
                            </TableCell>
                            <TableCell>
                               <div className="flex items-center gap-3">
                                  <Progress value={progress} className="h-2 flex-1" indicatorClassName={getProgressColor(progress)} />
                                  <span className="text-xs font-medium w-9 text-right">{progress.toFixed(0)}%</span>
                               </div>
                            </TableCell>
                            <TableCell className="text-right">
                               <div className="flex flex-col items-end">
                                  <span className="text-sm font-medium">{formatCurrency(target.total_actual)}</span>
                                  <span className="text-xs text-muted-foreground">/ {formatCurrency(target.total_target)}</span>
                               </div>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                               {(canUpdate || canDelete || canView) && (
                                  <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                                           <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                        {canView && (
                                           <DropdownMenuItem onClick={() => handleView(target)} className="cursor-pointer">
                                              <Eye className="h-4 w-4 mr-2" />
                                              {t("common.view")}
                                           </DropdownMenuItem>
                                        )}
                                         {canUpdate && (
                                           <DropdownMenuItem onClick={() => handleEdit(target)} className="cursor-pointer">
                                              <Pencil className="h-4 w-4 mr-2" />
                                              {t("common.edit")}
                                           </DropdownMenuItem>
                                        )}
                                         {canDelete && (
                                           <DropdownMenuItem onClick={() => setDeletingId(target.id)} className="cursor-pointer text-destructive focus:text-destructive">
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              {t("common.delete")}
                                           </DropdownMenuItem>
                                        )}
                                     </DropdownMenuContent>
                                  </DropdownMenu>
                               )}
                            </TableCell>
                         </TableRow>
                      );
                   })
                )}
             </TableBody>
          </Table>
        </div>

        {pagination && (
            <div className="pt-2">
              <DataTablePagination
                pageIndex={pagination.page}
                pageSize={pagination.per_page}
                rowCount={pagination.total}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
              />
            </div>
        )}
      </div>

      {canCreate && (
        <TargetForm
          open={isFormOpen}
          onClose={handleFormClose}
          target={editingTarget}
        />
      )}

      {canView && viewingTarget && (
        <TargetDetailModal
          open={!!viewingTarget}
          onClose={() => setViewingTarget(null)}
          target={viewingTarget}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("common.yearlyTarget")}
          isLoading={deleteTarget.isPending}
        />
      )}
    </div>
  );
}
