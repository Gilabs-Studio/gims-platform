import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate as formatDateUtil } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GeneralLedgerAccount, GLTransactionRow } from "../types";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return formatDateUtil(value);
}

interface Props {
  account: GeneralLedgerAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewJournal: (id: string) => void;
  onViewSource?: (transaction: GLTransactionRow) => void;
  canResolveSourceDetail: (type: string | null) => boolean;
}

export function AccountLedgerDetailDialog({ account, open, onOpenChange, onViewJournal, onViewSource, canResolveSourceDetail }: Props) {
  const t = useTranslations("financeReports");
  
  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t("ledger_detail")}: {account.account_code} - {account.account_name}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto mt-4 border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[120px]">{t("date")}</TableHead>
                <TableHead className="w-[220px]">{t("reference")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead>{t("memo")}</TableHead>
                <TableHead className="text-right w-[140px]">{t("debit")}</TableHead>
                <TableHead className="text-right w-[140px]">{t("credit")}</TableHead>
                <TableHead className="text-right w-40">{t("running_balance")}</TableHead>
                <TableHead className="text-right w-[220px]">{t("action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {account.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic text-xs">
                    {t("no_transactions")}
                  </TableCell>
                </TableRow>
              ) : (
                account.transactions.map((transaction, idx) => {
                  const canOpenSource = transaction.reference_type ? canResolveSourceDetail(transaction.reference_type) : false;
                  const debitVal = transaction.debit ?? 0;
                  const creditVal = transaction.credit ?? 0;
                  const runningBal = transaction.running_balance ?? 0;

                  return (
                    <TableRow key={`${transaction.journal_id}-${transaction.id}-${idx}`}>
                      <TableCell className="text-xs">{formatDate(transaction.entry_date)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {transaction.reference_code || `${transaction.reference_type ?? "-"}/${transaction.reference_id ?? "-"}`}
                      </TableCell>
                      <TableCell className="text-sm">{transaction.description || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{transaction.memo || "-"}</TableCell>
                      <TableCell className={`text-right text-xs font-mono ${debitVal > 0 ? "text-success" : "text-foreground"}`}>
                        {formatCurrency(debitVal)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-mono ${creditVal > 0 ? "text-destructive" : "text-foreground"}`}>
                        {formatCurrency(creditVal)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-mono font-semibold ${runningBal < 0 ? "text-destructive" : runningBal > 0 ? "text-success" : "text-foreground"}`}>
                        {formatCurrency(runningBal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canOpenSource && onViewSource && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 cursor-pointer"
                              onClick={() => onViewSource(transaction)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              <span className="text-xs">{t("source")}</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 cursor-pointer"
                            onClick={() => onViewJournal(transaction.journal_id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            <span className="text-xs">{t("journal")}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
