import type { AlertSeverity, LineStatusType } from "../types/live-monitoring.types";

export function getStatusBadgeVariant(status: LineStatusType): "success" | "warning" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "running":
      return "success";
    case "warning":
      return "warning";
    case "stop":
      return "destructive";
    case "maintenance":
      return "secondary";
    default:
      return "outline";
  }
}

export function getAlertBadgeVariant(severity: AlertSeverity): "destructive" | "warning" {
  switch (severity) {
    case "stop":
      return "destructive";
    case "warning":
      return "warning";
  }
}

export function formatInteger(val: number): string {
  return new Intl.NumberFormat("id-ID").format(val);
}

export function formatDecimal(val: number, decimals: number = 1): string {
  return val.toFixed(decimals);
}
