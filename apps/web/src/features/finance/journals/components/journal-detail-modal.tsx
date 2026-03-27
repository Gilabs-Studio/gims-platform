"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

import { useFinanceJournal } from "../hooks/use-finance-journals";
import { canResolveJournalSourceDetail, JournalSourceDetailModal } from "./journal-source-detail-modal";
import type { UnifiedJournalRow } from "./journal-table";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string | null;
};

function safeDate(value?: string | null): string {
  if (!value) return "-";
  return formatDate(value) || value;
}

function formatNumber(value?: number | null): string {
  const v = typeof value === "number" ? value : 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function JournalDetailModal({ open, onOpenChange, id }: Props) {
  const t = useTranslations("financeJournals");
  const tCommon = useTranslations("common");

  const enabled = open && !!id;
  const query = useFinanceJournal(id ?? "", { enabled });

  const journal = query.data?.data;
  const lines = useMemo(() => journal?.lines ?? [], [journal?.lines]);
  const referenceRow = useMemo<UnifiedJournalRow | null>(() => {
    if (!journal) return null;

    return {
      id: journal.id,
      entryDate: journal.entry_date,
      description: journal.description ?? null,
      referenceType: journal.reference_type ?? null,
      referenceId: journal.reference_id ?? null,
      referenceCode: journal.reference_code ?? null,
      status: journal.status,
      debit: journal.debit_total ?? 0,
      credit: journal.credit_total ?? 0,
      createdAt: journal.created_at,
      updatedAt: journal.updated_at,
      original: journal,
    };
  }, [journal]);
  const canOpenSource = canResolveJournalSourceDetail(journal?.reference_type ?? null);
  const [isSourceDetailOpen, setIsSourceDetailOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("actions.view")}</DialogTitle>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
        ) : !journal ? (
          <div className="text-center py-8 text-muted-foreground">-</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.entryDate")}</div>
                <div className="text-sm font-medium">{safeDate(journal.entry_date)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.status")}</div>
                <div className="text-sm font-medium">
                  <Badge variant={journal.status === "posted" ? "default" : "secondary"}>
                    {t(`status.${journal.status}`)}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.description")}</div>
                <div className="text-sm font-medium">{journal.description ?? "-"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.referenceType")}</div>
                <div className="text-sm font-medium">{journal.reference_type ?? "-"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Reference Code</div>
                <div className="text-sm font-medium font-mono">{journal.reference_code ?? "-"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Reference ID</div>
                <div className="text-sm font-medium font-mono break-all">{journal.reference_id ?? "-"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Source</div>
                <div className="text-sm font-medium uppercase">{journal.source ?? "-"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Created At</div>
                <div className="text-sm font-medium">{safeDate(journal.created_at)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Updated At</div>
                <div className="text-sm font-medium">{safeDate(journal.updated_at)}</div>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2 bg-muted/10">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audit Trail</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">Draft</Badge>
                <span className="text-muted-foreground">
                  created by <span className="font-medium text-foreground">{journal.created_by_name ?? "System"}</span>
                </span>
                {journal.status === "posted" || journal.status === "reversed" ? (
                  <>
                    <span className="text-muted-foreground">-&gt;</span>
                    <Badge variant="success">Posted</Badge>
                    <span className="text-muted-foreground">
                      at {safeDate(journal.posted_at ?? null)} by <span className="font-medium text-foreground">{journal.posted_by_name ?? "System"}</span>
                    </span>
                  </>
                ) : null}
                {journal.status === "reversed" ? (
                  <>
                    <span className="text-muted-foreground">-&gt;</span>
                    <Badge variant="destructive">Reversed</Badge>
                    <span className="text-muted-foreground">
                      at {safeDate(journal.reversed_at ?? null)} by <span className="font-medium text-foreground">{journal.reversed_by_name ?? "System"}</span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {journal.status === "reversed" && journal.reversal_reason && (
              <div className="rounded-md border border-destructive/20 p-3 space-y-1 bg-destructive/5">
                <div className="text-xs font-semibold text-destructive uppercase tracking-wider">Reversal Reason</div>
                <div className="text-sm italic text-muted-foreground">
                  &quot;{journal.reversal_reason}&quot;
                </div>
              </div>
            )}

            {canOpenSource && referenceRow ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => setIsSourceDetailOpen(true)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Source Transaction
                </Button>
              </div>
            ) : null}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fields.account")}</TableHead>
                    <TableHead className="text-right">{t("fields.debit")}</TableHead>
                    <TableHead className="text-right">{t("fields.credit")}</TableHead>
                    <TableHead>{t("fields.memo")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        -
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((ln) => (
                      <TableRow key={ln.id}>
                        <TableCell>
                          {ln.chart_of_account?.code ?? "-"} - {ln.chart_of_account?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(ln.debit)}</TableCell>
                        <TableCell className="text-right">{formatNumber(ln.credit)}</TableCell>
                        <TableCell>{ln.memo ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.debit")}</div>
                <div className="text-sm font-medium">{formatNumber(journal.debit_total)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.credit")}</div>
                <div className="text-sm font-medium">{formatNumber(journal.credit_total)}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <JournalSourceDetailModal
        open={isSourceDetailOpen}
        onOpenChange={setIsSourceDetailOpen}
        row={referenceRow}
      />
    </Dialog>
  );
}
