"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Eye, FileText, MoreHorizontal, Plus, RotateCcw, CalendarCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useUserPermission } from "@/hooks/use-user-permission";
import { FinanceListErrorState } from "@/features/finance/shared/components/finance-list-error-state";

import type { FinancialClosing } from "../types";
import { useApproveFinanceClosing, useDeleteFinanceClosing, useFinanceClosings, useReopenFinanceClosing, useYearEndClose } from "../hooks/use-finance-closing";
import { ClosingForm } from "./closing-form";
import { ClosingDetail } from "./closing-detail";

function getInitialOpenFinancialClosingFromURL(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("open_financial_closing");
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "approved":
    case "closed":
    case "confirmed":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {t(`status.${status}`)}
        </Badge>
      );
  }
}

export function ClosingList() {
  const t = useTranslations("financeClosing");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("financial_closing.create");
  const canApprove = useUserPermission("financial_closing.approve");
  const canReopen = useUserPermission("financial_closing.reopen");
  const canYearEnd = useUserPermission("financial_closing.year_end");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(getInitialOpenFinancialClosingFromURL);
  const [approving, setApproving] = useState<FinancialClosing | null>(null);
  const [reopening, setReopening] = useState<FinancialClosing | null>(null);
  const [deleting, setDeleting] = useState<FinancialClosing | null>(null);
  const [yearEndOpen, setYearEndOpen] = useState(false);

  const { data, isLoading, isError } = useFinanceClosings({
    page,
    per_page: pageSize,
    sort_by: "period_end_date",
    sort_dir: "desc",
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const pagination = data?.meta?.pagination;

  const approveMutation = useApproveFinanceClosing();
  const reopenMutation = useReopenFinanceClosing();
  const deleteMutation = useDeleteFinanceClosing();
  const yearEndMutation = useYearEndClose();

  useEffect(() => {
    if (detailId) {
      setDetailOpen(true);
    }
  }, [detailId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.get("open_financial_closing")) return;

    searchParams.delete("open_financial_closing");
    const nextQuery = searchParams.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextURL);
  }, []);

  if (isError) {
    return <FinanceListErrorState message={tCommon("error")} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            {canYearEnd && (
              <Button variant="outline" onClick={() => setYearEndOpen(true)} className="cursor-pointer">
                <CalendarCheck className="h-4 w-4 mr-2" />
                {t("actions.yearEndClose")}
              </Button>
            )}
            <Button onClick={() => setFormOpen(true)} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              {t("actions.create")}
            </Button>
          </div>
        )}
      </div>


      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.periodEndDate")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead>{t("fields.approvedAt")}</TableHead>
              <TableHead>{t("fields.notes")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="tabular-nums">{formatDate(item.period_end_date)}</TableCell>
                  <TableCell>{getStatusBadge(item.status, t)}</TableCell>
                  <TableCell>{item.approved_at ? formatDate(item.approved_at) : "-"}</TableCell>
                  <TableCell className="max-w-[520px] truncate">{item.notes || "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setDetailId(item.id);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("actions.view")}
                        </DropdownMenuItem>
                        {canApprove && item.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-success focus:text-success"
                            onClick={() => setApproving(item)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t("actions.approve")}
                          </DropdownMenuItem>
                        )}
                        {canReopen && item.status === "approved" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-warning focus:text-warning"
                            onClick={() => setReopening(item)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {t("actions.reopen")}
                          </DropdownMenuItem>
                        )}
                        {canCreate && item.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        pageIndex={pagination?.page ?? page}
        pageSize={pagination?.per_page ?? pageSize}
        rowCount={pagination?.total ?? rows.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <ClosingForm open={formOpen} onOpenChange={setFormOpen} />
      <ClosingDetail
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailId(null);
        }}
        closingId={detailId}
      />

      <DialogApprove
        open={!!approving}
        onOpenChange={(open) => {
          if (!open) setApproving(null);
        }}
        onConfirm={async () => {
          const id = approving?.id ?? "";
          if (!id) return;
          try {
            await approveMutation.mutateAsync(id);
            toast.success(t("toast.approved"));
            setApproving(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
        isLoading={approveMutation.isPending}
      />

      <DialogConfirm
        open={!!reopening}
        onOpenChange={(open) => {
          if (!open) setReopening(null);
        }}
        title={t("actions.reopen")}
        onConfirm={async () => {
          const id = reopening?.id ?? "";
          if (!id) return;
          try {
            await reopenMutation.mutateAsync(id);
            toast.success(t("toast.reopened"));
            setReopening(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
        isLoading={reopenMutation.isPending}
      />

      <DialogConfirm
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("actions.delete")}
        onConfirm={async () => {
          const id = deleting?.id ?? "";
          if (!id) return;
          try {
            await deleteMutation.mutateAsync(id);
            toast.success(t("toast.deleted"));
            setDeleting(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
        isLoading={deleteMutation.isPending}
      />

      <DialogYearEndClose
        open={yearEndOpen}
        onOpenChange={setYearEndOpen}
        onConfirm={async (fiscalYear: number) => {
          try {
            await yearEndMutation.mutateAsync(fiscalYear);
            toast.success(t("toast.yearEndClosed"));
            setYearEndOpen(false);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
        isLoading={yearEndMutation.isPending}
      />
    </div>
  );
}

function DialogApprove({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}) {
  const t = useTranslations("financeClosing");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("actions.approve")}</DialogTitle>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t("form.cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} className="cursor-pointer" disabled={isLoading}>
            {t("actions.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogConfirm({
  open,
  onOpenChange,
  title,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}) {
  const t = useTranslations("financeClosing");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t("form.cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} className="cursor-pointer" disabled={isLoading}>
            {title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogYearEndClose({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fiscalYear: number) => Promise<void>;
  isLoading: boolean;
}) {
  const t = useTranslations("financeClosing");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("actions.yearEndClose")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>{t("fields.fiscalYear")}</Label>
          <Input
            type="number"
            min={2000}
            max={2100}
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t("form.cancel")}
          </Button>
          <Button type="button" onClick={() => onConfirm(fiscalYear)} className="cursor-pointer" disabled={isLoading}>
            {t("actions.yearEndClose")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
