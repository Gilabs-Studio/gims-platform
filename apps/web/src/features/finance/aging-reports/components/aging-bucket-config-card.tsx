"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { hasPermissionCode } from "@/lib/permission-utils";
import { toast } from "sonner";

import {
  useFinanceAgingBucketConfig,
  useUpdateFinanceAgingBucketConfig,
} from "../hooks/use-finance-aging-reports";
import type { AgingBucketDefinition, AgingReportType } from "../types";
import { defaultAgingBucketConfig } from "./aging-table";
import { useTranslations } from "next-intl";

type BucketDraft = {
  key: string;
  label: string;
  min_days: string;
  max_days: string;
};

type ResolvedRange = {
  key: string;
  min: number;
  max: number;
};

function toDraft(bucket: AgingBucketDefinition): BucketDraft {
  return {
    key: bucket.key ?? "",
    label: bucket.label ?? "",
    min_days: bucket.min_days === undefined ? "" : String(bucket.min_days),
    max_days: bucket.max_days === undefined ? "" : String(bucket.max_days),
  };
}

function normalizeKey(raw: string, fallbackIndex: number): string {
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9\s_-]/g, "").replace(/[\s-]+/g, "_");
  return normalized || `bucket_${fallbackIndex + 1}`;
}

function parseNonNegativeInt(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

function reportTypeLabel(reportType: AgingReportType): string {
  return reportType === "ar" ? "Accounts Receivable (AR)" : "Accounts Payable (AP)";
}

function reportTypeKeyPrefix(reportType: AgingReportType): string {
  return reportType === "ar" ? "ar" : "ap";
}

type AgingBucketDraftEditorProps = {
  reportType: AgingReportType;
  sourceBuckets: AgingBucketDefinition[];
  isSaving: boolean;
  onSave: (buckets: AgingBucketDefinition[]) => void;
};

function AgingBucketDraftEditor({ reportType, sourceBuckets, isSaving, onSave }: AgingBucketDraftEditorProps) {
  const t = useTranslations("financeAgingReports");
  const [drafts, setDrafts] = useState<BucketDraft[]>(() => sourceBuckets.map(toDraft));
  const [validationError, setValidationError] = useState<string | null>(null);

  const onUpdateDraft = (index: number, field: keyof BucketDraft, value: string) => {
    setValidationError(null);
    setDrafts((prev) => prev.map((draft, idx) => (idx === index ? { ...draft, [field]: value } : draft)));
  };

  const onAddBucket = () => {
    setValidationError(null);
    setDrafts((prev) => [
      ...prev,
      {
        key: `${reportTypeKeyPrefix(reportType)}_bucket_${prev.length + 1}`,
        label: "",
        min_days: "",
        max_days: "",
      },
    ]);
  };

  const onRemoveBucket = (index: number) => {
    setValidationError(null);
    setDrafts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validateDrafts = (items: BucketDraft[]): { buckets: AgingBucketDefinition[]; error?: string } => {
    if (items.length === 0) {
      return { buckets: [], error: t("config.emptyBuckets") };
    }

    const seenKeys = new Set<string>();
    const ranges: ResolvedRange[] = [];
    const normalized: AgingBucketDefinition[] = [];
    let hasCurrentCoverage = false;
    let hasPositiveCoverage = false;

    for (let index = 0; index < items.length; index += 1) {
      const draft = items[index];
      const minDays = parseNonNegativeInt(draft.min_days);
      const maxDays = parseNonNegativeInt(draft.max_days);

      if (draft.min_days.trim() && minDays === undefined) {
        return { buckets: [], error: t("config.invalidMin", { index: index + 1 }) };
      }
      if (draft.max_days.trim() && maxDays === undefined) {
        return { buckets: [], error: t("config.invalidMax", { index: index + 1 }) };
      }
      if (minDays !== undefined && maxDays !== undefined && minDays > maxDays) {
        return { buckets: [], error: t("config.invalidRange", { index: index + 1 }) };
      }

      const key = normalizeKey(draft.key || draft.label, index);
      if (seenKeys.has(key)) {
        return { buckets: [], error: `Key bucket '${key}' duplikat` };
      }
      seenKeys.add(key);

      const label = draft.label.trim() || key;
      const resolvedMin = minDays ?? -1000000000;
      const resolvedMax = maxDays ?? 1000000000;

      if (!draft.min_days.trim() && !draft.max_days.trim()) {
        return { buckets: [], error: `Baris ${index + 1} wajib isi min atau max` };
      }

      if (resolvedMin <= 0 && resolvedMax >= 0) {
        hasCurrentCoverage = true;
      }
      if (resolvedMax > 0) {
        hasPositiveCoverage = true;
      }

      ranges.push({ key, min: resolvedMin, max: resolvedMax });

      const bucket: AgingBucketDefinition = { key, label };
      if (minDays !== undefined) {
        bucket.min_days = minDays;
      }
      if (maxDays !== undefined) {
        bucket.max_days = maxDays;
      }
      normalized.push(bucket);
    }

    for (let i = 0; i < ranges.length; i += 1) {
      for (let j = i + 1; j < ranges.length; j += 1) {
        const left = ranges[i];
        const right = ranges[j];
        if (left.min <= right.max && right.min <= left.max) {
          return { buckets: [], error: `Rentang bucket overlap: '${left.key}' dan '${right.key}'` };
        }
      }
    }

    if (!hasCurrentCoverage) {
      return { buckets: [], error: "Konfigurasi harus mencakup current (hari 0)" };
    }
    if (!hasPositiveCoverage) {
      return { buckets: [], error: "Konfigurasi harus mencakup overdue (> 0 hari)" };
    }

    return { buckets: normalized };
  };

  const activeLabel = reportTypeLabel(reportType);

  const handleSave = () => {
    const validation = validateDrafts(drafts);
    if (validation.error) {
      setValidationError(validation.error);
      toast.error(validation.error);
      return;
    }

    onSave(validation.buckets);
  };

  return (
    <>
      <p className="text-sm text-muted-foreground">{t("config.editing", { label: activeLabel })}</p>
      <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
        <p className="font-medium">{t("config.guideTitle")}</p>
        <p className="text-muted-foreground">{t("config.guideDescription")}</p>
      </div>
      <div className="space-y-2">
        {drafts.map((draft, index) => (
          <div key={`aging-bucket-${index}`} className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-3" placeholder={t("config.keyPlaceholder")} value={draft.key} onChange={(event) => onUpdateDraft(index, "key", event.target.value)} />
            <Input className="col-span-4" placeholder={t("config.labelPlaceholder")} value={draft.label} onChange={(event) => onUpdateDraft(index, "label", event.target.value)} />
            <Input className="col-span-2" placeholder={t("config.minPlaceholder")} inputMode="numeric" value={draft.min_days} onChange={(event) => onUpdateDraft(index, "min_days", event.target.value)} />
            <Input className="col-span-2" placeholder={t("config.maxPlaceholder")} inputMode="numeric" value={draft.max_days} onChange={(event) => onUpdateDraft(index, "max_days", event.target.value)} />
            <div className="col-span-1 flex justify-end">
              <Button type="button" variant="outline" size="icon" className="cursor-pointer" onClick={() => onRemoveBucket(index)}>
                -
              </Button>
            </div>
          </div>
        ))}
      </div>
      {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onAddBucket}>
          {t("config.addBucket")}
        </Button>
        <Button type="button" className="cursor-pointer" onClick={handleSave} disabled={isSaving}>
          {t("config.saveConfig")}
        </Button>
      </div>
    </>
  );
}

export function AgingBucketConfigCard({ reportType }: { reportType: AgingReportType }) {
  const { user } = useAuthStore();
  const permissions = user?.permissions ?? {};
  const canManage = hasPermissionCode(permissions, "finance_settings.update");

  const configQuery = useFinanceAgingBucketConfig(reportType, { enabled: canManage });
  const updateMutation = useUpdateFinanceAgingBucketConfig(reportType);

  const sourceBuckets = useMemo(() => {
    return configQuery.data?.data?.buckets?.length ? configQuery.data.data.buckets : defaultAgingBucketConfig;
  }, [configQuery.data?.data?.buckets]);

  const t = useTranslations("financeAgingReports");

  if (!canManage) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("config.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AgingBucketDraftEditor
          key={JSON.stringify(sourceBuckets)}
          reportType={reportType}
          sourceBuckets={sourceBuckets}
          isSaving={updateMutation.isPending || configQuery.isFetching}
          onSave={(buckets) => updateMutation.mutate({ buckets })}
        />
      </CardContent>
    </Card>
  );
}
