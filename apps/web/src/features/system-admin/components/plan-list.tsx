"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { PageMotion } from "@/components/motion/page-motion";
import { systemAdminService } from "../services/system-admin-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSubscriptionPlanCopy } from "@/lib/subscription-plan-copy";
import type { SubscriptionPlanConfig, PlanCategory } from "../types";
import { getMenuSectionSummary } from "../lib/plan-menu-catalog";

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function MenuSummaryBadges({
  plan,
  emptyLabel,
  moreLabel,
}: {
  plan: SubscriptionPlanConfig;
  emptyLabel: string;
  moreLabel: (count: number) => string;
}) {
  const summary = getMenuSectionSummary(plan.menu_urls ?? []);
  const entries = Object.entries(summary);

  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {entries.slice(0, 4).map(([section, count]) => (
        <Badge key={section} variant="outline" className="text-[10px]">
          {section} {count}
        </Badge>
      ))}
      {entries.length > 4 && (
        <Badge variant="outline" className="text-[10px]">
          {moreLabel( entries.length - 4 )}
        </Badge>
      )}
    </div>
  );
}

export function PlanList() {
  const t = useTranslations("systemAdmin.plans");
  const locale = useLocale();
  const categoryLabels: Record<PlanCategory, string> = {
    pos: t("category.pos"),
    erp: t("category.erp"),
    crm: t("category.crm"),
    hr: t("category.hr"),
    bundle: t("category.bundle"),
  };
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["system-admin", "plans"],
    queryFn: () => systemAdminService.listPlans({ per_page: 100 }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ slug, isActive }: { slug: string; isActive: boolean }) =>
      systemAdminService.setPlanActive(slug, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-admin", "plans"] }),
  });

  const plans = data?.data ?? [];

  const grouped = (Object.keys(categoryLabels) as PlanCategory[]).reduce<
    Record<PlanCategory, SubscriptionPlanConfig[]>
  >(
    (acc, category) => {
      acc[category] = plans.filter((plan) => plan.category === category);
      return acc;
    },
    { pos: [], erp: [], crm: [], hr: [], bundle: [] },
  );

  return (
    <PageMotion>
      <div className="space-y-6 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Button asChild className="gap-2 self-start cursor-pointer sm:self-auto">
            <Link href="/system/plans/form">
              <Plus className="h-4 w-4" />
              {t("addPlan")}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          (Object.keys(categoryLabels) as PlanCategory[]).map((category) => {
            const rows = grouped[category];
            if (rows.length === 0) {
              return null;
            }

            return (
              <div key={category} className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
                <div className="border-b border-border/70 bg-muted/30 px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {categoryLabels[category]}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">{t("slug")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("billing")}</TableHead>
                      <TableHead className="text-right">{t("monthly")}</TableHead>
                      <TableHead className="text-right">{t("yearly")}</TableHead>
                      <TableHead>{t("menuEntitlements")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((plan) => {
                      const planCopy = getSubscriptionPlanCopy(plan.slug, locale, {
                        name: plan.name,
                        description: plan.description,
                        features: plan.features,
                      });

                      return (
                        <TableRow key={plan.slug}>
                        <TableCell className="font-mono text-xs">{plan.slug}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-medium">{planCopy.name}</span>
                            <p className="text-xs text-muted-foreground">{planCopy.description}</p>
                          </div>
                          {plan.is_highlighted && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              {t("highlighted")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs capitalize">{plan.billing_type.replace("_", " ")}</TableCell>
                        <TableCell className="text-right text-sm">{formatIDR(plan.price_monthly_idr)}</TableCell>
                        <TableCell className="text-right text-sm">{formatIDR(plan.price_yearly_idr)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <MenuSummaryBadges
                              plan={plan}
                              emptyLabel={t("noMenuEntitlements")}
                              moreLabel={(count) => `+${count} ${t("sections")}`}
                            />
                            <div className="text-xs text-muted-foreground">
                              {t("urlsSelected", { count: (plan.menu_urls ?? []).length })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={plan.is_active}
                              onCheckedChange={(value) =>
                                toggleMutation.mutate({ slug: plan.slug, isActive: value })
                              }
                              aria-label={`Toggle ${planCopy.name}`}
                            />
                            <span
                              className={cn(
                                "text-xs",
                                plan.is_active ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {plan.is_active ? t("active") : t("inactive")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost" className="cursor-pointer">
                            <Link href={`/system/plans/form?slug=${plan.slug}`} aria-label={t("editPlan", { name: planCopy.name })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })
        )}
      </div>
    </PageMotion>
  );
}
