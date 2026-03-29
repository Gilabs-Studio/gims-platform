"use client";

import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { UnifiedJournalRow } from "./types";

interface ReferenceCodeLinkProps<T = unknown> {
  readonly row: UnifiedJournalRow<T>;
  readonly referenceTooltipText: string;
  readonly onReferenceClick?: (row: UnifiedJournalRow<T>) => void;
  readonly canReferenceClick?: (row: UnifiedJournalRow<T>) => boolean;
}

export function ReferenceCodeLink<T = unknown>({
  row,
  referenceTooltipText,
  onReferenceClick,
  canReferenceClick,
}: ReferenceCodeLinkProps<T>) {
  const isReferenceClickable = canReferenceClick ? canReferenceClick(row) : true;

  if (onReferenceClick && row.referenceCode && isReferenceClickable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="font-mono text-xs text-primary hover:underline cursor-pointer"
              onClick={() => onReferenceClick(row)}
            >
              {row.referenceCode}
            </button>
          </TooltipTrigger>
          <TooltipContent>{referenceTooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (row.sourceHref && row.referenceCode) {
    return (
      <Link href={row.sourceHref} className="font-mono text-xs text-primary hover:underline cursor-pointer">
        {row.referenceCode}
      </Link>
    );
  }

  return <span className="font-mono text-xs">{row.referenceCode ?? "-"}</span>;
}
