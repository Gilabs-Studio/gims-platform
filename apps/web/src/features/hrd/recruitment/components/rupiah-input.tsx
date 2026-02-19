"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Format number for display as Indonesian Rupiah (e.g. 20000 → "20.000") */
export function formatRupiahDisplay(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "";
  return value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

/** Parse display string back to number (e.g. "20.000" or "20000" → 20000) */
export function parseRupiahInput(str: string): number | undefined {
  const digits = str.replace(/\D/g, "");
  if (digits === "") return undefined;
  const num = parseInt(digits, 10);
  return isNaN(num) ? undefined : num;
}

interface RupiahInputProps {
  value?: number;
  onChange?: (value: number | undefined) => void;
  placeholder?: string;
  min?: number;
  className?: string;
  "data-testid"?: string;
}

export function RupiahInput({
  value,
  onChange,
  placeholder = "0",
  min = 0,
  className,
  "data-testid": testId,
}: RupiahInputProps) {
  const displayValue = formatRupiahDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseRupiahInput(raw);
    if (parsed !== undefined && parsed < min) {
      onChange?.(min);
    } else {
      onChange?.(parsed);
    }
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(className)}
      data-testid={testId}
    />
  );
}
