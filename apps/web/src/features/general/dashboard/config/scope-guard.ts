import type { WidgetType } from "../types";

const OWN_SAFE_WIDGETS = new Set<WidgetType>([
  "recent_invoices",
  "track_orders",
  "track_purchase_orders",
  "pending_approvals_sales",
  "pending_approvals_purchase",
  "hr_attendance_today",
  "hr_pending_leaves",
]);

export function isDashboardWidgetRestrictedByScope(
  widgetType: WidgetType,
  permissionScope: string | null | undefined,
): boolean {
  const scope = permissionScope?.trim().toUpperCase() ?? "";
  if (!scope || scope === "ALL") {
    return false;
  }

  if (scope === "OWN") {
    return !OWN_SAFE_WIDGETS.has(widgetType);
  }

  return false;
}
