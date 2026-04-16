"use client";

type BalanceIndicatorProps = {
  totalDebit: number;
  totalCredit: number;
  tolerance?: number;
};

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function BalanceIndicator({
  totalDebit,
  totalCredit,
  tolerance = 0.01,
}: BalanceIndicatorProps) {
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) <= tolerance;

  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">Balance Indicator</div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
        <div>
          <div className="text-muted-foreground">Total Debit</div>
          <div className="font-medium">{formatNumber(totalDebit)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Total Credit</div>
          <div className="font-medium">{formatNumber(totalCredit)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Difference</div>
          <div className={isBalanced ? "font-medium text-emerald-600" : "font-medium text-destructive"}>
            {formatNumber(difference)}
          </div>
        </div>
      </div>
    </div>
  );
}
