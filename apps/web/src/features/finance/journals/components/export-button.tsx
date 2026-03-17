"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { JournalEntry } from "../types";

type ExportButtonProps = {
  readonly data?: JournalEntry[];
  readonly filename?: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick?: () => void | Promise<void>;
};

function toCsvValue(value: string | number): string {
  const asText = String(value ?? "");
  const escaped = asText.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function ExportButton({
  data,
  filename,
  label,
  disabled = false,
  onClick,
}: ExportButtonProps) {
  const handleExport = () => {
    if (onClick) {
      void onClick();
      return;
    }

    if (!data || data.length === 0 || !filename) return;

    const headers = [
      "Entry Date",
      "Description",
      "Status",
      "Reference Type",
      "Reference ID",
      "Debit",
      "Credit",
    ];

    const rows = data.map((item) => [
      item.entry_date,
      item.description ?? "",
      item.status,
      item.reference_type ?? "",
      item.reference_id ?? "",
      item.debit_total,
      item.credit_total,
    ]);

    const content = [headers, ...rows]
      .map((cols) => cols.map((col) => toCsvValue(col)).join(","))
      .join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      className="cursor-pointer"
      onClick={handleExport}
      disabled={disabled || (!onClick && (!data || data.length === 0 || !filename))}
    >
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
