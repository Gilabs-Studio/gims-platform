"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { SubscriptionPlanConfig, PlanCategory } from "../types";
import { getMenuSectionSummary } from "../lib/plan-menu-catalog";

const CATEGORY_LABELS: Record<PlanCategory, string> = {
  pos: "POS",
  erp: "ERP",
  crm: "CRM",
  hr: "HR",
  bundle: "Bundle",
};

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function MenuSummaryBadges({ plan }: { plan: SubscriptionPlanConfig }) {
  const summary = getMenuSectionSummary(plan.menu_urls ?? []);
  const entries = Object.entries(summary);

  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground">No menu entitlements</span>;
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
          +{entries.length - 4} sections
        </Badge>
      )}
    </div>
  );
}

export function PlanList() {
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

  const grouped = (Object.keys(CATEGORY_LABELS) as PlanCategory[]).reduce<
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
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage pricing, features, and menu entitlements for each plan.
            </p>
          </div>
          <Button asChild className="gap-2 cursor-pointer">
            <Link href="/system/plans/form">
              <Plus className="h-4 w-4" />
              Add Plan
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
          (Object.keys(CATEGORY_LABELS) as PlanCategory[]).map((category) => {
            const rows = grouped[category];
            if (rows.length === 0) {
              return null;
            }

            return (
              <div key={category} className="rounded-lg border border-border/80">
                <div className="border-b border-border/80 bg-muted/40 px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABELS[category]}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Slug</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Billing</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead className="text-right">Yearly</TableHead>
                      <TableHead>Menu Entitlements</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((plan) => (
                      <TableRow key={plan.slug}>
                        <TableCell className="font-mono text-xs">{plan.slug}</TableCell>
                        <TableCell>
                          <span className="font-medium">{plan.name}</span>
                          {plan.is_highlighted && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              Highlighted
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs capitalize">{plan.billing_type.replace("_", " ")}</TableCell>
                        <TableCell className="text-right text-sm">{formatIDR(plan.price_monthly_idr)}</TableCell>
                        <TableCell className="text-right text-sm">{formatIDR(plan.price_yearly_idr)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <MenuSummaryBadges plan={plan} />
                            <div className="text-xs text-muted-foreground">
                              {(plan.menu_urls ?? []).length} URLs selected
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
                              aria-label={`Toggle ${plan.name}`}
                            />
                            <span
                              className={cn(
                                "text-xs",
                                plan.is_active ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {plan.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost" className="cursor-pointer">
                            <Link href={`/system/plans/form?slug=${plan.slug}`} aria-label={`Edit ${plan.name}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
