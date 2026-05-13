import React, { type ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { DynamicIcon } from "@/lib/icon-utils";
import type { VisitActivityMetadata, VisitProductInterest } from "./types";

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

function getProductIdentityKey(product: VisitProductInterest): string | null {
  if (product.product_id) return `id:${product.product_id}`;
  if (product.product_sku) return `sku:${product.product_sku.toLowerCase()}`;
  if (product.product_name) return `name:${product.product_name.toLowerCase()}`;
  return null;
}

export function aggregateVisitProducts(products?: VisitProductInterest[] | null): VisitProductInterest[] {
  if (!products?.length) return [];

  const aggregated = new Map<string, VisitProductInterest>();

  for (const product of products) {
    const key = getProductIdentityKey(product);
    if (!key) continue;

    const existing = aggregated.get(key);
    if (!existing) {
      aggregated.set(key, {
        ...product,
        quantity: product.quantity ?? 0,
      });
      continue;
    }

    aggregated.set(key, {
      ...existing,
      interest_level: Math.max(existing.interest_level ?? 0, product.interest_level ?? 0),
      quantity: (existing.quantity ?? 0) + (product.quantity ?? 0),
      unit_price:
        existing.unit_price && existing.unit_price > 0
          ? existing.unit_price
          : product.unit_price,
      notes: product.notes || existing.notes,
      survey_answers:
        (product.survey_answers?.length ?? 0) > (existing.survey_answers?.length ?? 0)
          ? product.survey_answers
          : existing.survey_answers,
    });
  }

  return Array.from(aggregated.values());
}
