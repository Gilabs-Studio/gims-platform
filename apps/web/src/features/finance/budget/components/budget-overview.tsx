"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, Wallet, PiggyBank, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Budget } from "../types";
import { BudgetProgressCard } from "./budget-progress-card";

interface BudgetOverviewProps {
  readonly budgets: Budget[];
  readonly isLoading?: boolean;
  readonly onBudgetClick?: (budget: Budget) => void;
}

interface StatCardProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
  readonly color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border bg-card shadow-sm`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold font-mono tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function BudgetOverview({ budgets, isLoading, onBudgetClick }: BudgetOverviewProps) {
  const t = useTranslations("financeBudget");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalPlanned = budgets.reduce((sum, b) => sum + (b.total_amount ?? 0), 0);
  const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount ?? 0), 0);
  const totalRemaining = Math.max(0, totalPlanned - totalUsed);
  const overallUtil = totalPlanned > 0 ? Math.round((totalUsed / totalPlanned) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Wallet className="h-5 w-5 text-blue-600" />}
          label={t("overview.totalBudget")}
          value={formatCurrency(totalPlanned)}
          color="bg-blue-50 dark:bg-blue-950/40"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
          label={t("overview.totalUsed")}
          value={formatCurrency(totalUsed)}
          color="bg-amber-50 dark:bg-amber-950/40"
        />
        <StatCard
          icon={<PiggyBank className="h-5 w-5 text-green-600" />}
          label={t("overview.totalRemaining")}
          value={formatCurrency(totalRemaining)}
          color="bg-green-50 dark:bg-green-950/40"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
          label={t("overview.utilizationRate")}
          value={`${overallUtil}%`}
          color="bg-purple-50 dark:bg-purple-950/40"
        />
      </div>

      {budgets.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {budgets.map((budget, idx) => (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05, ease: [0.4, 0, 0.2, 1] }}
            >
              <BudgetProgressCard
                label={budget.name ?? "-"}
                department={budget.department}
                plannedAmount={budget.total_amount ?? 0}
                usedAmount={budget.used_amount ?? 0}
                status={budget.status}
                onClick={() => onBudgetClick?.(budget)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
