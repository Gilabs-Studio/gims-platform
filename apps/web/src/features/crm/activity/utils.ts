import {
  Activity,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { VisitActivityMetadata } from "./types";

const ACTIVITY_ICON_MAP: Record<string, LucideIcon> = {
  "map-pin": MapPin,
  phone: Phone,
  mail: Mail,
  users: Users,
  "refresh-cw": RefreshCw,
};

/** Maps an ActivityType icon code (e.g. "phone") to the corresponding Lucide icon component. Falls back to Activity. */
export function getActivityTypeIcon(iconCode?: string | null): LucideIcon {
  if (!iconCode) return Activity;
  return ACTIVITY_ICON_MAP[iconCode] ?? Activity;
}

/** Safely parses visit activity metadata from the JSON metadata field.
 * Handles both pre-parsed objects and legacy double-encoded JSON strings.
 */
export function parseVisitMetadata(metadata?: Record<string, unknown> | null | string): VisitActivityMetadata | null {
  if (!metadata) return null;
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as VisitActivityMetadata;
    } catch {
      return null;
    }
  }
  return metadata as VisitActivityMetadata;
}
