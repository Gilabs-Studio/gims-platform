"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { BudgetList, BudgetForm, BudgetDetail } from "../components";
import type { AssetBudget } from "../types";

export function AssetBudgetsPage() {
  const t = useTranslations("assetBudget");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedBudget, setSelectedBudget] = useState<AssetBudget | null>(
    null,
  );

  const handleCreate = () => {
    setFormMode("create");
    setSelectedBudget(null);
    setFormOpen(true);
  };

  const handleEdit = (budget: AssetBudget) => {
    setFormMode("edit");
    setSelectedBudget(budget);
    setFormOpen(true);
  };

  const handleView = (budget: AssetBudget) => {
    setSelectedBudget(budget);
    setDetailOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <BudgetList
        onCreate={handleCreate}
        onEdit={handleEdit}
        onView={handleView}
      />

      <BudgetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        budget={selectedBudget}
      />

      <BudgetDetail
        budget={selectedBudget}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

export default AssetBudgetsPage;
