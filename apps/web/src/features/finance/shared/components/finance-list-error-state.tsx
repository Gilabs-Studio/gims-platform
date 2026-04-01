"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  message: string;
};

export function FinanceListErrorState({ message }: Props) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 py-10 px-4 text-center">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
