"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useFinanceAdjustmentApprovalHistory } from "../hooks/use-finance-journals";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journalId?: string | null;
};

export function AdjustmentApprovalHistoryDialog({ open, onOpenChange, journalId }: Props) {
  const t = useTranslations("financeJournals");

  const query = useFinanceAdjustmentApprovalHistory(journalId ?? "", {
    enabled: open && !!journalId,
  });

  const items = query.data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("actions.approvalHistory")}</DialogTitle>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : query.isError ? (
          <div className="text-sm text-destructive py-4">{t("toast.failed")}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">-</div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="uppercase">
                    {item.action}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {item.actor_id}
                </div>
                {item.notes ? <div className="text-sm mt-2">{item.notes}</div> : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
