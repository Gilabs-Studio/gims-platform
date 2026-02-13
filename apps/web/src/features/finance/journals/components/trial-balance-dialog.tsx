"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useTrialBalance } from "../hooks/use-finance-journals";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatNumber(value?: number | null): string {
  const v = typeof value === "number" ? value : 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function TrialBalanceDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("financeJournals");
  const tCommon = useTranslations("common");

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const params = useMemo(() => {
    const p: { start_date?: string; end_date?: string } = {};
    if (startDate.trim()) p.start_date = startDate.trim();
    if (endDate.trim()) p.end_date = endDate.trim();
    return p;
  }, [startDate, endDate]);

  const query = useTrialBalance(params, { enabled: open });
  const rows = query.data?.data?.rows ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("actions.trialBalance")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">{t("fields.debit")}</TableHead>
                  <TableHead className="text-right">{t("fields.credit")}</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      -
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.chart_of_account_id}>
                      <TableCell>{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.debit_total)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.credit_total)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.balance)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
