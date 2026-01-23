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

export function formatDate(
  date: Date | string | null | undefined,
  locale: string = "id-ID"
): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "";
  
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dateObj);
}

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  // Try to use NEXT_PUBLIC_API_URL, fallback to localhost:8080
  // Note: This needs to match the backend's static file serving URL
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  
  // Clean up double slashes if url starts with /
  const cleanPath = url.startsWith("/") ? url.substring(1) : url;
  
  // If the path already has "uploads/" prefix and API serves from root, good.
  // Assuming API serves static files typically under /uploads or similar route.
  // The user paths were like apps/api/uploads/..., so likely just appending to base is correct if backend routes it.
  // If backend is Go Fiber/Echo/Gin usually Static("/uploads", "./uploads")
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Sorts an array of items alphabetically based on a label extracted from each item.
 * @param data The array of items to sort.
 * @param getLabel A function that extracts the string label to sort by from an item.
 * @returns A new sorted array.
 */
export function sortOptions<T>(data: readonly T[], getLabel: (item: T) => string): T[] {
  return [...data].sort((a, b) => {
    const labelA = getLabel(a);
    const labelB = getLabel(b);
    return labelA.localeCompare(labelB);
  });
}
