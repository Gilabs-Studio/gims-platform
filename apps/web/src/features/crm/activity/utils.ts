import {
  Activity,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
