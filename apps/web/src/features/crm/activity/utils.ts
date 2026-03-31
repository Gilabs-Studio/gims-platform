import React, { type ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { DynamicIcon } from "@/lib/icon-utils";
import type { VisitActivityMetadata } from "./types";

const DEFAULT_ACTIVITY_ICON = "circle";

function normalizeActivityIconName(iconCode?: string | null): string {
  const normalized = (iconCode ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  return normalized || DEFAULT_ACTIVITY_ICON;
}

/** Maps an ActivityType icon code (e.g. "phone") to a dynamic Lucide icon component. Falls back to Circle. */
export function getActivityTypeIcon(iconCode?: string | null): ComponentType<LucideProps> {
  const iconName = normalizeActivityIconName(iconCode);

  const ActivityTypeIcon = (props: LucideProps) => {
    const normalizedSize = typeof props.size === "number" ? props.size : undefined;
    return React.createElement(DynamicIcon, { ...props, name: iconName, size: normalizedSize });
  };

  ActivityTypeIcon.displayName = `ActivityTypeIcon(${iconName})`;
  return ActivityTypeIcon;
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
