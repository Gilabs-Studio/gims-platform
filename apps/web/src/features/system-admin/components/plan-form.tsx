"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/routing";
import { ArrowLeft, Check, CheckSquare, Minus, RotateCcw, Save } from "lucide-react";
import { PageMotion } from "@/components/motion/page-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { systemAdminService } from "../services/system-admin-service";
import type {
  PlanBillingType,
  PlanCategory,
  SubscriptionPlanConfig,
  UpsertPlanRequest,
} from "../types";
import {
  expandMasterDataMenuURLs,
  getDefaultMenuURLsForPlan,
  getMenuSectionSummary,
  getPlanMenuCatalog,
} from "../lib/plan-menu-catalog";

const CATEGORY_LABELS: Record<PlanCategory, string> = {
  pos: "POS",
  erp: "ERP",
  crm: "CRM",
  hr: "HR",
  bundle: "Bundle",
};

function buildInitialForm(plan?: SubscriptionPlanConfig | null): UpsertPlanRequest {
  return {
    slug: plan?.slug ?? "",
    name: plan?.name ?? "",
    category: plan?.category ?? "pos",
    description: plan?.description ?? "",
    billing_type: plan?.billing_type ?? "per_user",
    price_monthly_idr: plan?.price_monthly_idr ?? 0,
    price_yearly_idr: plan?.price_yearly_idr ?? 0,
    min_users: plan?.min_users ?? 1,
    max_users: plan?.max_users ?? 500,
    is_highlighted: plan?.is_highlighted ?? false,
    sort_order: plan?.sort_order ?? 0,
    features: plan?.features ?? [],
    menu_urls: expandMasterDataMenuURLs(getDefaultMenuURLsForPlan({
      slug: plan?.slug,
      category: plan?.category,
      existingMenuURLs: plan?.menu_urls,
    })),
  };
}

function buildFormSyncKey(form: UpsertPlanRequest, featuresText: string): string {
  return JSON.stringify({
    slug: form.slug ?? "",
    name: form.name ?? "",
    category: form.category ?? "",
    description: form.description ?? "",
    billing_type: form.billing_type ?? "",
    price_monthly_idr: form.price_monthly_idr ?? 0,
    price_yearly_idr: form.price_yearly_idr ?? 0,
    min_users: form.min_users ?? 1,
    max_users: form.max_users ?? 500,
    is_highlighted: !!form.is_highlighted,
    sort_order: form.sort_order ?? 0,
    featuresText,
    menu_urls: [...(form.menu_urls ?? [])].sort(),
  });
}

function SelectionIndicator({
  checked,
  indeterminate = false,
}: {
  checked: boolean;
  indeterminate?: boolean;
}) {
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border",
        checked || indeterminate
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background",
      )}
      aria-hidden="true"
    >
      {checked ? <Check className="h-3 w-3" /> : indeterminate ? <Minus className="h-3 w-3" /> : null}
    </span>
  );
}

export function PlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const slug = searchParams.get("slug")?.trim() ?? "";
  const isNew = slug === "";
  const menuCatalog = useMemo(() => getPlanMenuCatalog(), []);

  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UpsertPlanRequest>(buildInitialForm());
  const [featuresText, setFeaturesText] = useState("");
  const lastHydratedFormKeyRef = useRef("");

  const { data, isLoading } = useQuery({
    queryKey: ["system-admin", "plans"],
    queryFn: () => systemAdminService.listPlans({ per_page: 100 }),
  });

  const currentPlan = useMemo(
    () => data?.data.find((plan) => plan.slug === slug) ?? null,
    [data?.data, slug],
  );

  useEffect(() => {
    const nextForm = buildInitialForm(currentPlan);
    if (isNew && !currentPlan) {
      nextForm.menu_urls = getDefaultMenuURLsForPlan({ category: nextForm.category });
    }
    const nextFeaturesText = (nextForm.features ?? []).join("\n");
    const nextKey = buildFormSyncKey(nextForm, nextFeaturesText);

    if (lastHydratedFormKeyRef.current === nextKey) {
      return;
    }

    lastHydratedFormKeyRef.current = nextKey;
    setForm(nextForm);
    setFeaturesText(nextFeaturesText);
  }, [currentPlan, isNew]);

  const mutation = useMutation({
    mutationFn: (payload: UpsertPlanRequest) => systemAdminService.upsertPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-admin", "plans"] });
      router.push("/system/plans");
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError.response?.data?.error?.message ?? "Failed to save plan");
    },
  });

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return menuCatalog;
    }
    return menuCatalog.filter((item) => {
      const haystack = [item.label, item.section, item.url, ...item.parents].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [menuCatalog, search]);

  const groupedCatalog = useMemo(() => {
    return filteredCatalog.reduce<Record<string, typeof filteredCatalog>>((acc, item) => {
      acc[item.section] ??= [];
      acc[item.section].push(item);
      return acc;
    }, {});
  }, [filteredCatalog]);

  const selectedMenuURLSet = useMemo(() => new Set(form.menu_urls ?? []), [form.menu_urls]);
  const sectionSummary = useMemo(() => getMenuSectionSummary(form.menu_urls ?? []), [form.menu_urls]);

  const updateField = <K extends keyof UpsertPlanRequest>(key: K, value: UpsertPlanRequest[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMenuURL = (menuURL: string) => {
    setForm((prev) => {
      const current = new Set(prev.menu_urls ?? []);
      if (current.has(menuURL)) {
        current.delete(menuURL);
      } else {
        current.add(menuURL);
      }
      return { ...prev, menu_urls: Array.from(current) };
    });
  };

  const toggleSection = (section: string) => {
    const sectionItems = menuCatalog.filter((item) => item.section === section).map((item) => item.url);
    setForm((prev) => {
      const current = new Set(prev.menu_urls ?? []);
      const allSelected = sectionItems.every((item) => current.has(item));
      for (const menuURL of sectionItems) {
        if (allSelected) {
          current.delete(menuURL);
        } else {
          current.add(menuURL);
        }
      }
      return { ...prev, menu_urls: Array.from(current) };
    });
  };

  const applyDefaultTemplate = () => {
    const menuURLs = getDefaultMenuURLsForPlan({
      slug: form.slug,
      category: form.category,
      existingMenuURLs: [],
    });
    updateField("menu_urls", expandMasterDataMenuURLs(menuURLs));
  };

  const handleCategoryChange = (value: PlanCategory) => {
    setForm((prev) => {
      const next = { ...prev, category: value };
      if (isNew) {
        next.menu_urls = expandMasterDataMenuURLs(
          getDefaultMenuURLsForPlan({ slug: next.slug, category: value, existingMenuURLs: [] }),
        );
      }
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    mutation.mutate({
      ...form,
      features: featuresText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
  };

  if (isLoading) {
    return (
      <PageMotion>
        <div className="space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageMotion>
    );
  }

  if (!isNew && !currentPlan) {
    return (
      <PageMotion>
        <div className="space-y-4">
          <Link href="/system/plans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
          </Link>
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-xl font-semibold">Plan not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">The selected plan could not be loaded.</p>
          </div>
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/system/plans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Plans
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-foreground">
              {isNew ? "Create Plan" : `Edit Plan: ${currentPlan?.name}`}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure pricing and menu entitlements from navigation paths instead of module toggles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={applyDefaultTemplate} className="gap-2 cursor-pointer">
              <RotateCcw className="h-4 w-4" />
              Apply Default Template
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2 cursor-pointer">
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-slug">Slug</Label>
                  <Input
                    id="plan-slug"
                    value={form.slug}
                    onChange={(event) => updateField("slug", event.target.value)}
                    placeholder="e.g. pos_growth"
                    disabled={!isNew}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-name">Name</Label>
                  <Input
                    id="plan-name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="e.g. POS Growth"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-category">Category</Label>
                  <Select value={form.category} onValueChange={(value) => handleCategoryChange(value as PlanCategory)}>
                    <SelectTrigger id="plan-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABELS) as PlanCategory[]).map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-billing">Billing Type</Label>
                  <Select
                    value={form.billing_type}
                    onValueChange={(value) => updateField("billing_type", value as PlanBillingType)}
                  >
                    <SelectTrigger id="plan-billing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_user">Per User</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-price-monthly">Monthly Price (IDR)</Label>
                  <Input
                    id="plan-price-monthly"
                    type="number"
                    min={0}
                    value={form.price_monthly_idr}
                    onChange={(event) => updateField("price_monthly_idr", Number(event.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-price-yearly">Yearly Price (IDR)</Label>
                  <Input
                    id="plan-price-yearly"
                    type="number"
                    min={0}
                    value={form.price_yearly_idr}
                    onChange={(event) => updateField("price_yearly_idr", Number(event.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-min-users">Min Users</Label>
                  <Input
                    id="plan-min-users"
                    type="number"
                    min={1}
                    value={form.min_users}
                    onChange={(event) => updateField("min_users", Number(event.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-max-users">Max Users</Label>
                  <Input
                    id="plan-max-users"
                    type="number"
                    min={1}
                    value={form.max_users}
                    onChange={(event) => updateField("max_users", Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-description">Description</Label>
                  <Input
                    id="plan-description"
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Short positioning for this plan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-features">Features (one per line)</Label>
                  <Textarea
                    id="plan-features"
                    rows={5}
                    value={featuresText}
                    onChange={(event) => setFeaturesText(event.target.value)}
                    placeholder={"Point of Sale\nSales Orders\nMaster Data"}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="plan-highlighted"
                    checked={form.is_highlighted}
                    onCheckedChange={(value) => updateField("is_highlighted", value)}
                  />
                  <Label htmlFor="plan-highlighted">Highlighted (recommended)</Label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-sort-order">Sort Order</Label>
                  <Input
                    id="plan-sort-order"
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(event) => updateField("sort_order", Number(event.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Menu Entitlements</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select navigation menu URLs that belong to this plan. Legacy module access will be derived automatically.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateField("menu_urls", menuCatalog.map((item) => item.url))}
                    className="cursor-pointer"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateField("menu_urls", [])}
                    className="cursor-pointer"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search menu label or path..."
                  className="max-w-sm"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedMenuURLSet.size} menu selected
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {Object.entries(groupedCatalog).map(([section, items]) => {
                  const sectionSelectedCount = items.filter((item) => selectedMenuURLSet.has(item.url)).length;
                  const allSelected = sectionSelectedCount === items.length && items.length > 0;
                  const someSelected = sectionSelectedCount > 0 && !allSelected;

                  return (
                    <section key={section} className="rounded-xl border border-border/80">
                      <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-muted/30 px-4 py-3">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleSection(section)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleSection(section);
                            }
                          }}
                          className="flex items-center gap-3 text-left cursor-pointer"
                        >
                          <SelectionIndicator checked={allSelected} indeterminate={someSelected} />
                          <div>
                            <div className="font-medium text-foreground">{section}</div>
                            <div className="text-xs text-muted-foreground">
                              {sectionSelectedCount}/{items.length} selected
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{sectionSummary[section] ?? 0} active</div>
                      </div>
                      <div className="divide-y divide-border/60">
                        {items.map((item) => {
                          const checked = selectedMenuURLSet.has(item.url);
                          return (
                            <div
                              key={item.url}
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleMenuURL(item.url)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  toggleMenuURL(item.url);
                                }
                              }}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20",
                                checked && "bg-primary/5",
                              )}
                            >
                              <SelectionIndicator checked={checked} />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-foreground">{item.label}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{item.url}</div>
                                {item.parents.length > 1 && (
                                  <div className="mt-1 text-[11px] text-muted-foreground/80">
                                    {item.parents.join(" / ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Selection Summary</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(sectionSummary).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No menu selected yet.</p>
                ) : (
                  Object.entries(sectionSummary)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([section, count]) => (
                      <div key={section} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{section}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Compatibility</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Module entitlements are no longer edited directly here. They will be derived automatically from the selected menu URLs when you save the plan.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}
          </aside>
        </div>
      </form>
    </PageMotion>
  );
}
