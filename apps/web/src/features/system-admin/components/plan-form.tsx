"use client";

import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/routing";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Minus,
  RotateCcw,
  Save,
  Search,
  X,
  Info,
  Layers,
  Zap,
} from "lucide-react";
import { useFieldArray, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getMenuIcon } from "@/lib/menu-icons";
import { navigationConfig, type NavItem } from "@/lib/navigation-config";
import { systemAdminService } from "../services/system-admin-service";
import type { PlanBillingType, PlanCategory, SubscriptionPlanConfig } from "../types";
import {
  expandMasterDataMenuURLs,
  getDefaultMenuURLsForPlan,
  getMenuSectionSummary,
} from "../lib/plan-menu-catalog";
import { planSchema, type PlanFormValues } from "../schemas/plan.schema";
import { AnimatePresence, motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<PlanCategory, string> = {
  pos: "POS",
  erp: "ERP",
  crm: "CRM",
  hr: "HR",
  bundle: "Bundle",
};

const TENANT_OWNER_ROLE_CODE = "tenant_owner";

function ensureTenantOwnerRoleTemplate(templates: PlanFormValues["role_templates"]): PlanFormValues["role_templates"] {
  const normalized = templates.map((item) => ({
    code: item.code?.trim().toLowerCase() ?? "",
    name: item.name ?? "",
    description: item.description ?? "",
  }));

  if (normalized.some((item) => item.code === TENANT_OWNER_ROLE_CODE)) {
    return normalized;
  }

  return [
    {
      code: TENANT_OWNER_ROLE_CODE,
      name: "Owner",
      description: "Main account owner role with full access.",
    },
    ...normalized,
  ];
}

interface MenuTreeNode {
  id: string;
  name: string;
  icon: string;
  url: string;
  children?: MenuTreeNode[];
  isHeader?: boolean;
}

// ---------------------------------------------------------------------------
// Tree Helpers
// ---------------------------------------------------------------------------

function buildMenuTree(items: NavItem[]): MenuTreeNode[] {
  return items.map((item) => ({
    id: item.url || item.name,
    name: item.name,
    icon: item.icon,
    url: item.url || "",
    isHeader: Boolean(item.children?.length),
    children: item.children ? buildMenuTree(item.children) : undefined,
  }));
}

function collectAllLeafUrls(node: MenuTreeNode): string[] {
  if (!node.children?.length) return node.url ? [node.url] : [];
  return node.children.flatMap(collectAllLeafUrls);
}

function filterMenuTree(nodes: MenuTreeNode[], query: string): MenuTreeNode[] {
  const q = query.toLowerCase();
  return nodes.reduce<MenuTreeNode[]>((acc, node) => {
    const matches =
      node.name.toLowerCase().includes(q) ||
      (node.url && node.url.toLowerCase().includes(q));
    
    if (matches) {
      acc.push(node);
    } else if (node.children) {
      const filteredChildren = filterMenuTree(node.children, q);
      if (filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren });
      }
    }
    return acc;
  }, []);
}

// ---------------------------------------------------------------------------
// Tree Components
// ---------------------------------------------------------------------------

const MenuTreeRow = memo(function MenuTreeRow({
  node,
  depth,
  selectedUrls,
  onToggle,
  onToggleAll,
  isExpanded,
  onToggleExpand,
  searchActive,
}: {
  node: MenuTreeNode;
  depth: number;
  selectedUrls: Set<string>;
  onToggle: (url: string) => void;
  onToggleAll: (urls: string[], select: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  searchActive: boolean;
}) {
  const hasChildren = Boolean(node.children?.length);
  const leafUrls = useMemo(() => collectAllLeafUrls(node), [node]);
  const selectedInBranch = useMemo(
    () => leafUrls.filter((url) => selectedUrls.has(url)).length,
    [leafUrls, selectedUrls],
  );
  
  const allSelected = leafUrls.length > 0 && selectedInBranch === leafUrls.length;
  const someSelected = selectedInBranch > 0 && !allSelected;

  const handleToggle = (e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleAll(leafUrls, !allSelected);
    } else if (node.url) {
      onToggle(node.url);
    }
  };

  const paddingLeft = 12 + depth * 20;

  return (
    <div className="group">
      <div
        className={cn(
          "flex items-center gap-3 py-2 pr-4 transition-all cursor-pointer border-l-2 border-transparent",
          allSelected ? "bg-primary/5 border-primary/40" : "hover:bg-muted/50",
          someSelected && "bg-primary/2 border-primary/20",
        )}
        style={{ paddingLeft }}
        onClick={() => hasChildren && onToggleExpand(node.id)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "size-3.5 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90",
                )}
              />
            )}
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={() => {
                if (hasChildren) {
                  onToggleAll(leafUrls, !allSelected);
                } else if (node.url) {
                  onToggle(node.url);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="size-4 cursor-pointer"
            />
          </div>
          
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={cn(
              "shrink-0 text-muted-foreground transition-colors group-hover:text-primary",
              (allSelected || someSelected) && "text-primary/70"
            )}>
              {getMenuIcon(node.icon)}
            </span>
            <div className="flex flex-col truncate">
              <span className={cn(
                "text-sm font-medium truncate transition-colors",
                hasChildren ? "text-foreground" : "text-foreground/90",
                allSelected && "text-primary font-semibold"
              )}>
                {node.name}
              </span>
              {node.url && !hasChildren && (
                <span className="text-[10px] text-muted-foreground truncate font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                  {node.url}
                </span>
              )}
            </div>
          </div>
        </div>

        {hasChildren && (
          <div className="shrink-0 flex items-center gap-2">
             <span className="text-[10px] tabular-nums font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
               {selectedInBranch}/{leafUrls.length}
             </span>
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {(isExpanded || searchActive) && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <MenuTreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedUrls={selectedUrls}
                onToggle={onToggle}
                onToggleAll={onToggleAll}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
                searchActive={searchActive}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const slug = searchParams.get("slug")?.trim() ?? "";
  const isNew = slug === "";
  
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["system-admin", "plans"],
    queryFn: () => systemAdminService.listPlans({ per_page: 100 }),
  });

  const currentPlan = useMemo(
    () => plansData?.data.find((p) => p.slug === slug) ?? null,
    [plansData?.data, slug],
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      slug: "",
      name: "",
      category: "pos",
      billing_type: "per_user",
      price_monthly_idr: 0,
      price_yearly_idr: 0,
      min_users: 1,
      max_users: 500,
      is_active: true,
      is_highlighted: false,
      sort_order: 0,
      features: [],
      role_templates: [{ code: TENANT_OWNER_ROLE_CODE, name: "Owner", description: "Main account owner role with full access." }],
      menu_urls: [],
      description: "",
    },
  });

  const {
    fields: roleTemplateFields,
    append: appendRoleTemplate,
    remove: removeRoleTemplate,
  } = useFieldArray({
    control,
    name: "role_templates",
  });

  const watchedValues = useWatch({ control }) as PlanFormValues;
  const selectedMenuUrls = useMemo(() => new Set((watchedValues.menu_urls as string[]) || []), [watchedValues.menu_urls]);
  const sectionSummary = useMemo(() => getMenuSectionSummary((watchedValues.menu_urls as string[]) || []), [watchedValues.menu_urls]);

  useEffect(() => {
    if (currentPlan) {
      reset({
        ...currentPlan,
        category: currentPlan.category as PlanCategory,
        billing_type: currentPlan.billing_type as PlanBillingType,
        features: currentPlan.features ?? [],
        role_templates: ensureTenantOwnerRoleTemplate(
          currentPlan.role_templates?.length > 0
            ? currentPlan.role_templates
            : [{ code: TENANT_OWNER_ROLE_CODE, name: "Owner", description: "Main account owner role with full access." }],
        ),
        menu_urls: expandMasterDataMenuURLs(currentPlan.menu_urls ?? []),
      });
    } else if (isNew) {
      const defaultUrls = getDefaultMenuURLsForPlan({ category: "pos" });
      reset({
        slug: "",
        name: "",
        category: "pos",
        billing_type: "per_user",
        price_monthly_idr: 0,
        price_yearly_idr: 0,
        min_users: 1,
        max_users: 500,
        is_active: true,
        is_highlighted: false,
        sort_order: 0,
        features: [],
        role_templates: [{ code: TENANT_OWNER_ROLE_CODE, name: "Owner", description: "Main account owner role with full access." }],
        menu_urls: expandMasterDataMenuURLs(defaultUrls),
        description: "",
      });
    }
  }, [currentPlan, isNew, reset, slug, plansData]);

  const mutation = useMutation({
    mutationFn: (payload: PlanFormValues) => systemAdminService.upsertPlan(payload as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-admin", "plans"] });
      toast.success("Plan saved successfully");
      router.push("/system/plans");
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message ?? "Failed to save plan";
      toast.error(message);
    },
  });

  const onSubmit = (data: PlanFormValues) => {
    mutation.mutate(data);
  };

  const onInvalid = () => {
    toast.error("Please check the form for errors", {
      description: "Ensure all required fields are filled correctly, including menu selections.",
    });
  };

  const handleToggleUrl = useCallback((url: string) => {
    const current = new Set(watchedValues.menu_urls ?? []);
    if (current.has(url)) current.delete(url);
    else current.add(url);
    setValue("menu_urls", Array.from(current), { shouldValidate: true });
  }, [watchedValues.menu_urls, setValue]);

  const handleToggleAllUrls = useCallback((urls: string[], select: boolean) => {
    const current = new Set(watchedValues.menu_urls ?? []);
    if (select) {
      urls.forEach((url) => current.add(url));
    } else {
      urls.forEach((url) => current.delete(url));
    }
    setValue("menu_urls", Array.from(current), { shouldValidate: true });
  }, [watchedValues.menu_urls, setValue]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const menuTree = useMemo(() => buildMenuTree(navigationConfig), []);
  const filteredTree = useMemo(() => {
    if (!search.trim()) return menuTree;
    return filterMenuTree(menuTree, search.trim());
  }, [menuTree, search]);

  const handleCategoryChange = (value: PlanCategory) => {
    if (!value) return;
    setValue("category", value, { shouldValidate: true });
    if (isNew) {
      const defaultUrls = getDefaultMenuURLsForPlan({
        category: value,
        slug: watchedValues.slug,
      });
      setValue("menu_urls", expandMasterDataMenuURLs(defaultUrls));
    }
  };

  const applyDefaultTemplate = () => {
    const menuURLs = getDefaultMenuURLsForPlan({
      slug: watchedValues.slug as string,
      category: watchedValues.category as PlanCategory,
      existingMenuURLs: [],
    });
    setValue("menu_urls", expandMasterDataMenuURLs(menuURLs), { shouldValidate: true });
    toast.info("Applied default template for " + (watchedValues.category ? watchedValues.category.toUpperCase() : ""));
  };

  if (isLoadingPlans) {
    return (
      <PageMotion className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-4">
              <Skeleton className="h-[600px] w-full rounded-2xl" />
            </div>
            <div className="col-span-8">
              <Skeleton className="h-[800px] w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="p-4 md:p-6">
      <form onSubmit={handleSubmit(onSubmit as any, onInvalid)} className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/system/plans"
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              Back to Plans
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isNew ? "Create Plan" : `Edit Plan: ${currentPlan?.name}`}
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Configure pricing, capacity, and navigation entitlements for this subscription tier.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyDefaultTemplate}
              className="gap-2 cursor-pointer h-10 px-4 rounded-xl shadow-xs"
            >
              <RotateCcw className="size-4" />
              Reset Template
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="gap-2 h-10 px-6 rounded-xl cursor-pointer shadow-md shadow-primary/20"
            >
              {isSubmitting || mutation.isPending ? (
                <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <Save className="size-4" />
              )}
              {isNew ? "Create Plan" : "Update Plan"}
            </Button>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Summary & Compatibility (Sticky on Desktop) */}
          <aside className="xl:col-span-4 space-y-6 xl:sticky xl:top-24 order-2 xl:order-1">
            {/* Selection Summary */}
            <div className="group rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-border/80">
               <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Layers className="size-4" />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight">Selection Summary</h2>
                  </div>
               </div>
               <div className="p-6 space-y-4">
                 {Object.keys(sectionSummary).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                        <Check className="size-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm text-muted-foreground">Select menu items to see breakdown</p>
                    </div>
                 ) : (
                    <>
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        <span>Modules</span>
                        <span>Views</span>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10">
                        {Object.entries(sectionSummary)
                          .sort(([ca], [cb]) => ca.localeCompare(cb))
                          .map(([section, count]) => (
                            <div key={section} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 transition-colors hover:bg-muted/40">
                              <div className="flex items-center gap-3">
                                <div className="size-2 rounded-full bg-primary/40" />
                                <span className="text-sm font-medium">{section}</span>
                              </div>
                              <span className="text-sm font-bold bg-background px-2.5 py-0.5 rounded-lg border border-border/50 shadow-xs tabular-nums">
                                {count}
                              </span>
                            </div>
                          ))}
                      </div>
                      <div className="pt-4 border-t border-dashed border-border mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-foreground">Total Entitlements</span>
                          <span className="font-bold text-primary text-base tabular-nums">
                            {watchedValues.menu_urls?.length ?? 0}
                          </span>
                        </div>
                      </div>
                    </>
                 )}
               </div>
            </div>

            {/* Compatibility Note */}
            <div className="rounded-2xl border border-primary/20 bg-primary/2 p-6 space-y-4 relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
               <div className="flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Zap className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight text-primary">Compatibility</h3>
                    <p className="text-sm text-primary/80 leading-relaxed">
                      Module entitlements are derived automatically from selected menu URLs. 
                      Changes are synced to the backend plan config upon saving.
                    </p>
                  </div>
               </div>
            </div>

            {/* Price Preview Card */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-sm text-muted-foreground uppercase font-semibold tracking-wide">Standard Billing</span>
                     <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                        {watchedValues.billing_type === "per_user" ? "Billed Per Seat" : "Fixed Pricing"}
                     </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight">Rp {(watchedValues.price_monthly_idr ?? 0).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground font-medium">/ month</span>
                    </div>
                    <div className="text-sm text-muted-foreground/80">
                      Yearly saving: Rp {( (Number(watchedValues.price_monthly_idr) || 0) * 12 - (Number(watchedValues.price_yearly_idr) || 0)).toLocaleString()} / plan
                    </div>
                  </div>
               </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Form Fields & Menu Tree */}
          <main className="xl:col-span-8 space-y-8 order-1 xl:order-2">
            {/* General Information Card */}
            <div className="rounded-3xl border border-border/50 bg-card p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-3 border-b border-border/50 pb-6">
                <div className="size-10 rounded-2xl bg-muted flex items-center justify-center text-foreground font-bold shadow-xs">1</div>
                <h2 className="text-2xl font-bold tracking-tight">General Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-sm font-semibold ml-1">Plan Slug</Label>
                  <Input
                    id="slug"
                    {...register("slug")}
                    className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all"
                    placeholder="e.g. pos-premium"
                    disabled={!isNew}
                  />
                  {errors.slug && <p className="text-xs text-destructive ml-1">{errors.slug.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold ml-1">Display Name</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all"
                    placeholder="e.g. POS Premium"
                  />
                  {errors.name && <p className="text-xs text-destructive ml-1">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold ml-1">Plan Category</Label>
                  <Select 
                    value={(watchedValues.category as string) || ""} 
                    onValueChange={(val: string) => {
                      if (val) {
                        handleCategoryChange(val as PlanCategory);
                      }
                    }}
                  >
                    <SelectTrigger id="category" className={cn("h-11 rounded-xl bg-muted/30 border-border/50", errors.category && "border-destructive")}>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="rounded-lg">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive ml-1">{errors.category.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_type" className="text-sm font-semibold ml-1">Pricing Model</Label>
                  <Select 
                    value={(watchedValues.billing_type as string) || ""} 
                    onValueChange={(val: string) => setValue("billing_type", val as any, { shouldValidate: true })}
                  >
                    <SelectTrigger id="billing_type" className={cn("h-11 rounded-xl bg-muted/30 border-border/50", errors.billing_type && "border-destructive")}>
                      <SelectValue placeholder="Select Billing Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      <SelectItem value="per_user" className="rounded-lg">Per User (Scalable)</SelectItem>
                      <SelectItem value="flat" className="rounded-lg">Flat Fee (Unlimited Users)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.billing_type && <p className="text-xs text-destructive ml-1">{errors.billing_type.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold ml-1 md:col-span-2">Pricing Details</Label>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold ml-1">Monthly (IDR)</span>
                        <Input
                          id="price_monthly_idr"
                          type="number"
                          {...register("price_monthly_idr")}
                          className={cn("h-11 rounded-xl bg-muted/30 border-border/50", errors.price_monthly_idr && "border-destructive")}
                        />
                        {errors.price_monthly_idr && <p className="text-[10px] text-destructive ml-1">{errors.price_monthly_idr.message}</p>}
                     </div>
                     <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold ml-1">Yearly (IDR)</span>
                        <Input
                          id="price_yearly_idr"
                          type="number"
                          {...register("price_yearly_idr")}
                          className={cn("h-11 rounded-xl bg-muted/30 border-border/50", errors.price_yearly_idr && "border-destructive")}
                        />
                        {errors.price_yearly_idr && <p className="text-[10px] text-destructive ml-1">{errors.price_yearly_idr.message}</p>}
                     </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold ml-1">Capacity Limits</Label>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold ml-1">Min Users</span>
                        <Input
                          type="number"
                          {...register("min_users")}
                          className={cn("h-11 rounded-xl bg-muted/30 border-border/50", errors.min_users && "border-destructive")}
                        />
                        {errors.min_users && <p className="text-[10px] text-destructive ml-1">{errors.min_users.message}</p>}
                     </div>
                     <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold ml-1">Max Users</span>
                        <Input
                          type="number"
                          {...register("max_users")}
                          className={cn("h-11 rounded-xl bg-muted/30 border-border/50", errors.max_users && "border-destructive")}
                        />
                        {errors.max_users && <p className="text-[10px] text-destructive ml-1">{errors.max_users.message}</p>}
                     </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                 <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold ml-1">Tagline / Description</Label>
                    <Input
                      id="description"
                      {...register("description")}
                      className="h-11 rounded-xl bg-muted/30 border-border/50"
                      placeholder="e.g. Best for medium scale restaurants with multiple outlets"
                    />
                 </div>
                 
                 <div className="space-y-2">
                    <Label htmlFor="features" className="text-sm font-semibold ml-1">Marketing Features (One per line)</Label>
                    <Textarea 
                      id="features"
                      rows={5}
                      className="rounded-2xl bg-muted/30 border-border/50 focus:bg-background transition-all"
                      placeholder="Unlimited Outlets\nAdvanced Analytics\n24/7 Priority Support"
                      defaultValue={watchedValues.features?.join("\n")}
                      onChange={(e) => {
                        const lines = e.target.value.split("\n").filter(Boolean);
                        setValue("features", lines);
                      }}
                    />
                 </div>

                 <div className="space-y-4 rounded-2xl border border-border/50 bg-muted/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold ml-1">Role Templates</Label>
                        <p className="text-xs text-muted-foreground ml-1">
                          These roles will be generated for every new tenant using this plan.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendRoleTemplate({ code: "", name: "", description: "" })}
                        className="cursor-pointer"
                      >
                        Add Role
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {roleTemplateFields.map((field, index) => {
                        const isTenantOwnerTemplate = (watchedValues.role_templates?.[index]?.code ?? "").trim().toLowerCase() === TENANT_OWNER_ROLE_CODE;

                        return (
                        <div key={field.id} className="rounded-xl border border-border/50 bg-background p-4 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {isTenantOwnerTemplate ? "Required Owner Role" : `Role ${index + 1}`}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRoleTemplate(index)}
                              className="h-8 px-2 text-destructive hover:text-destructive cursor-pointer"
                              disabled={roleTemplateFields.length === 1 || isTenantOwnerTemplate}
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold ml-1">Name</Label>
                              <Input
                                {...register(`role_templates.${index}.name` as const)}
                                className={cn("h-10 rounded-xl bg-muted/30 border-border/50", errors.role_templates?.[index]?.name && "border-destructive")}
                                placeholder="Admin"
                              />
                              {errors.role_templates?.[index]?.name && (
                                <p className="text-xs text-destructive ml-1">{errors.role_templates[index]?.name?.message}</p>
                              )}
                            </div>

                            <div className="space-y-2 md:col-span-1">
                              <Label className="text-xs font-semibold ml-1">Description</Label>
                              <Input
                                {...register(`role_templates.${index}.description` as const)}
                                className="h-10 rounded-xl bg-muted/30 border-border/50"
                                placeholder="Full access to manage the system"
                              />
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="is_active" className="font-semibold cursor-pointer">Active Plan</Label>
                      <Switch
                        id="is_active"
                        checked={watchedValues.is_active}
                        onCheckedChange={(val) => setValue("is_active", val)}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="is_highlighted" className="font-semibold cursor-pointer">Recommended</Label>
                      <Switch
                        id="is_highlighted"
                        checked={watchedValues.is_highlighted}
                        onCheckedChange={(val) => setValue("is_highlighted", val)}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="sort_order" className="font-semibold shrink-0">Priority</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        {...register("sort_order")}
                        className="h-9 rounded-lg bg-muted/30 border-border/50 text-center"
                      />
                    </div>
                 </div>
              </div>
            </div>

            {/* Menu Entitlements Card */}
            <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col min-h-[600px]">
              <div className="p-8 border-b border-border/50 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-muted flex items-center justify-center text-foreground font-bold shadow-xs">2</div>
                    <h2 className="text-2xl font-bold tracking-tight">Navigation Entitlements</h2>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setValue("menu_urls", collectAllLeafUrls({ id: "root", name: "root", icon: "", url: "", children: menuTree }))}
                      className="text-[10px] h-7 text-primary hover:bg-primary/5 rounded-lg font-bold px-2"
                    >
                      SELECT ALL
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setValue("menu_urls", [])}
                      className="text-[10px] h-7 text-muted-foreground hover:bg-muted/50 rounded-lg px-2"
                    >
                      CLEAR
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedIds(new Set())}
                      className="text-[10px] h-7 text-muted-foreground hover:bg-muted/50 rounded-lg px-2 opacity-70 hover:opacity-100"
                    >
                      COLLAPSE
                    </Button>
                  </div>
                </div>

                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter menu items..."
                    className={cn(
                      "pl-10 h-10 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all shadow-xs",
                      errors.menu_urls && "border-destructive ring-destructive/20"
                    )}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                    >
                      <X className="size-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {errors.menu_urls && (
                  <p className="text-xs text-destructive font-medium mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                    {errors.menu_urls.message}
                  </p>
                )}
              </div>

              <div className="flex-1 divide-y divide-border/30">
                {filteredTree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                    <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Search className="size-8 text-muted-foreground/20" />
                    </div>
                    <p className="text-lg font-semibold text-foreground/70">No matching menu titles</p>
                    <p className="text-sm text-muted-foreground mt-1">Try searching for other keywords like "finance" or "/pos"</p>
                    <Button variant="outline" onClick={() => setSearch("")} className="mt-6 rounded-xl">Clear Search</Button>
                  </div>
                ) : (
                  filteredTree.map((node) => (
                    <MenuTreeRow
                      key={node.id}
                      node={node}
                      depth={0}
                      selectedUrls={selectedMenuUrls}
                      onToggle={handleToggleUrl}
                      onToggleAll={handleToggleAllUrls}
                      isExpanded={expandedIds.has(node.id)}
                      onToggleExpand={toggleExpand}
                      searchActive={Boolean(search.trim())}
                    />
                  ))
                )}
              </div>

              {/* Scroll Info Footer */}
              <div className="p-4 bg-muted/10 border-t border-border/50">
                 <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                    <Info className="size-3" />
                    <span>Selected items define available navigation for tenants</span>
                 </div>
              </div>
            </div>
          </main>
        </div>
      </form>
    </PageMotion>
  );
}
