import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string | null | undefined,
  locale: string = "id-ID",
  currency: string = "IDR"
): string {
  if (value === null || value === undefined || value === "") {
    return "Rp 0";
  }
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return "Rp 0";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
}
