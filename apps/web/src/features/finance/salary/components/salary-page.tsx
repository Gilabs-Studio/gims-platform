"use client";

import { useTranslations } from "next-intl";

export function SalaryPage() {
  const t = useTranslations("financeSalary");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <div className="rounded-md border p-6">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    </div>
  );
}
