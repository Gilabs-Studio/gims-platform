"use client";

import { AlertTriangle, CreditCard, ShieldCheck, ShieldOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CreditLimitIndicatorProps {
  creditLimit: number;
  creditIsActive: boolean;
  orderTotal: number;
  className?: string;
}

export function CreditLimitIndicator({
  creditLimit,
  creditIsActive,
  orderTotal,
  className,
}: CreditLimitIndicatorProps) {
  if (!creditIsActive || creditLimit <= 0) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground ${className ?? ""}`}
      >
        <ShieldOff className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Credit control not active for this customer</span>
      </div>
    );
  }

  const remainingCredit = creditLimit - orderTotal;
  const usagePercent = creditLimit > 0 ? (orderTotal / creditLimit) * 100 : 0;
  const isOverLimit = orderTotal > creditLimit;
  const isWarning = usagePercent >= 80 && !isOverLimit;

  if (isOverLimit) {
    return (
      <div
        className={`flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs ${className ?? ""}`}
      >
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-destructive mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-destructive">
            Credit limit exceeded!
          </span>
          <span className="text-muted-foreground">
            Limit: {formatCurrency(creditLimit)} · Order: {formatCurrency(orderTotal)} · Over by{" "}
            <span className="font-semibold text-destructive">{formatCurrency(Math.abs(remainingCredit))}</span>
          </span>
          <span className="text-muted-foreground/80 italic">
            Requires credit_override permission to approve
          </span>
        </div>
      </div>
    );
  }

  if (isWarning) {
    return (
      <div
        className={`flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs ${className ?? ""}`}
      >
        <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-warning mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-warning">
            Approaching credit limit ({usagePercent.toFixed(0)}%)
          </span>
          <span className="text-muted-foreground">
            Limit: {formatCurrency(creditLimit)} · Remaining: {formatCurrency(remainingCredit)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs ${className ?? ""}`}
    >
      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-success" />
      <span className="text-muted-foreground">
        Credit: {formatCurrency(remainingCredit)} remaining of {formatCurrency(creditLimit)}
      </span>
    </div>
  );
}
