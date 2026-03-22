"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicIcon } from "@/lib/icon-utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useLucideIcons } from "../hooks/use-lucide-icons";

interface LucideIconSelectorProps {
  readonly value?: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}

export function LucideIconSelector({ value, onChange, disabled = false }: LucideIconSelectorProps) {
  const t = useTranslations("activityType");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError } = useLucideIcons({
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const selectedLabel = useMemo(() => {
    if (!value) return t("form.iconNotSelected");
    const selected = items.find((item) => item.name === value);
    return selected?.label ?? value;
  }, [items, t, value]);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-2">
        <DynamicIcon name={value || "circle"} className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">{selectedLabel}</span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("form.iconSearchPlaceholder")}
          className="pl-8"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto">
        {isLoading && (
          <div className="text-sm text-muted-foreground px-1">{tCommon("loading")}</div>
        )}

        {isError && (
          <div className="text-sm text-destructive px-1">{tCommon("error")}</div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="text-sm text-muted-foreground px-1">{t("form.iconEmpty")}</div>
        )}

        {!isLoading && !isError && items.map((item) => {
          const isSelected = value === item.name;
          return (
            <Button
              key={item.name}
              type="button"
              variant={isSelected ? "secondary" : "ghost"}
              className="justify-start gap-2 cursor-pointer"
              onClick={() => onChange(item.name)}
              disabled={disabled}
            >
              <DynamicIcon name={item.name} className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{item.name}</span>
            </Button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={disabled || !pagination?.has_prev}
        >
          {tCommon("previous")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("form.iconPage", {
            current: pagination?.page ?? 1,
            total: pagination?.total_pages ?? 1,
          })}
        </span>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={disabled || !pagination?.has_next}
        >
          {tCommon("next")}
        </Button>
      </div>
    </div>
  );
}
