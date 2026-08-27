"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BankReconciliation, BankStatementLine } from "../types";

export interface DualTableRow {
  id: string;
  vendor: string;
  invoiceNumber: string;
  status: "auto_matched" | "manual_matched" | "unmatched" | "date_mismatch" | "excluded";
  amount: number;
  raisedDate: string;

  // Statement side
  statementVendor?: string;
  statementInvoiceNumber?: string;
  statementPeriod?: string;
  statementAmount?: number;
  statementRaisedDate?: string;
  statementLineId?: string;
}

interface ReconciliationDualTableProps {
  reconciliation?: BankReconciliation | null;
  statementLines?: BankStatementLine[];
  onAutoMatch?: () => void;
  onConfirm?: () => void;
  onOpenUploadModal?: () => void;
  isLoading?: boolean;
}

export function ReconciliationDualTable({
  reconciliation,
  statementLines = [],
  onAutoMatch,
  onConfirm,
  onOpenUploadModal,
  isLoading = false,
}: ReconciliationDualTableProps) {
  const t = useTranslations("financeBankReconciliation");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const rows: DualTableRow[] = statementLines.map((ln) => ({
    id: ln.id,
    vendor: ln.description || "Cash Transaction",
    invoiceNumber: ln.reference || "-",
    status: ln.status as DualTableRow["status"],
    amount: ln.amount,
    raisedDate: ln.date,
    statementVendor: ln.description || "Bank Statement Entry",
    statementInvoiceNumber: ln.reference || "-",
    statementPeriod: reconciliation?.statement_date || ln.date,
    statementAmount: ln.amount,
    statementRaisedDate: ln.date,
    statementLineId: ln.id,
  }));

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const renderStatusBadge = (status: DualTableRow["status"]) => {
    switch (status) {
      case "auto_matched":
      case "manual_matched":
        return <Badge variant="success">{t("status.auto_matched")}</Badge>;
      case "date_mismatch":
        return <Badge variant="warning">{t("status.date_mismatch")}</Badge>;
      case "unmatched":
        return <Badge variant="destructive">{t("status.unmatched")}</Badge>;
      case "excluded":
        return <Badge variant="outline">{t("status.excluded")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between bg-card p-2.5 rounded-lg border border-border">
        <span className="text-xs text-muted-foreground font-medium">
          {selectedIds.length} of {rows.length} selected
        </span>

        <div className="flex items-center gap-2">
          {onAutoMatch && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoMatch}
              disabled={isLoading || rows.length === 0}
              className="cursor-pointer text-xs font-medium h-8"
            >
              {t("actions.autoMatch")}
            </Button>
          )}

          {onConfirm && (
            <Button
              variant="default"
              size="sm"
              onClick={onConfirm}
              disabled={isLoading || reconciliation?.status === "locked" || rows.length === 0}
              className="cursor-pointer text-xs font-medium h-8 bg-primary text-primary-foreground"
            >
              {t("actions.confirm")}
            </Button>
          )}
        </div>
      </div>

      {/* Dual Side-by-Side Table Container */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {rows.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-10 text-center space-y-2">
            <div className="text-sm font-semibold text-foreground">No Statement Lines Found</div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Upload a bank statement file (PDF, CSV, MT940, OFX) to start reconciliation.
            </p>
            {onOpenUploadModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenUploadModal}
                className="cursor-pointer text-xs mt-1"
              >
                {t("uploadStatement")}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 font-medium text-muted-foreground">
                  <th className="py-2.5 px-3 w-8">
                    <Checkbox
                      checked={selectedIds.length === rows.length && rows.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-medium">{t("vendor")}</th>
                  <th className="py-2.5 px-3 font-medium">{t("invoiceNumber")}</th>
                  <th className="py-2.5 px-3 font-medium text-center">{t("fields.status")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">{t("fields.amount")}</th>
                  <th className="py-2.5 px-3 font-medium text-right border-r border-border">{t("raisedDate")}</th>

                  <th className="py-2.5 px-3 font-medium">{t("vendor")}</th>
                  <th className="py-2.5 px-3 font-medium">{t("invoiceNumber")}</th>
                  <th className="py-2.5 px-3 font-medium">{t("statement")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">{t("fields.amount")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">{t("raisedDate")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const isSelected = selectedIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isSelected ? "bg-primary/5" : "hover:bg-muted/20"
                      }`}
                    >
                      <td className="py-2 px-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(row.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3 font-medium text-foreground max-w-[140px] truncate">
                        {row.vendor}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-mono">
                        {row.invoiceNumber}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {renderStatusBadge(row.status)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-foreground font-mono">
                        {row.amount > 0 ? formatCurrency(row.amount, "USD") : "-"}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground border-r border-border">
                        {row.raisedDate}
                      </td>

                      <td className="py-2 px-3 font-medium text-foreground max-w-[150px] truncate">
                        {row.statementVendor}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-mono">
                        {row.statementInvoiceNumber}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-mono">
                        {row.statementPeriod}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-foreground font-mono">
                        {row.statementAmount && row.statementAmount > 0
                          ? formatCurrency(row.statementAmount, "USD")
                          : "-"}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {row.statementRaisedDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
