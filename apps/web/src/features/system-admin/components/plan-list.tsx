"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SubscriptionPlanConfig,
  UpsertPlanRequest,
  PlanCategory,
  PlanBillingType,
} from "../types";

const CATEGORY_LABELS: Record<PlanCategory, string> = {
  pos: "POS",
  erp: "ERP",
  crm: "CRM",
  hr: "HR",
  bundle: "Bundle",
};

const AVAILABLE_MODULES = ["pos", "sales", "purchase", "inventory", "finance", "crm", "hr"] as const;

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Edit / Create Dialog ───────────────────────────────────────────────────

interface EditPlanDialogProps {
  open: boolean;
  plan: SubscriptionPlanConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditPlanDialog({ open, plan, onClose, onSaved }: EditPlanDialogProps) {
  const isNew = plan === null;

  const [form, setForm] = useState<UpsertPlanRequest>(() => ({
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
    modules: plan?.modules ?? [],
  }));
  const [featuresText, setFeaturesText] = useState<string>(
    (plan?.features ?? []).join("\n"),
  );
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: UpsertPlanRequest) => systemAdminService.upsertPlan(payload),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message ?? "Failed to save plan");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const features = featuresText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    mutation.mutate({ ...form, features });
  };

  const toggleModule = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules?.includes(slug)
        ? prev.modules.filter((m) => m !== slug)
        : [...(prev.modules ?? []), slug],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Plan" : `Edit — ${plan.name}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-slug">Slug</Label>
              <Input
                id="plan-slug"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="e.g. pos_essential"
                disabled={!isNew}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. POS Essential"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v as PlanCategory }))}
              >
                <SelectTrigger id="plan-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as PlanCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-billing">Billing Type</Label>
              <Select
                value={form.billing_type}
                onValueChange={(v) => setForm((p) => ({ ...p, billing_type: v as PlanBillingType }))}
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-price-monthly">Monthly Price (IDR)</Label>
              <Input
                id="plan-price-monthly"
                type="number"
                min={0}
                value={form.price_monthly_idr}
                onChange={(e) => setForm((p) => ({ ...p, price_monthly_idr: Number(e.target.value) }))}
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
                onChange={(e) => setForm((p) => ({ ...p, price_yearly_idr: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-min-users">Min Users</Label>
              <Input
                id="plan-min-users"
                type="number"
                min={1}
                value={form.min_users}
                onChange={(e) => setForm((p) => ({ ...p, min_users: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-max-users">Max Users</Label>
              <Input
                id="plan-max-users"
                type="number"
                min={1}
                value={form.max_users}
                onChange={(e) => setForm((p) => ({ ...p, max_users: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-description">Description</Label>
            <Input
              id="plan-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short tagline"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-features">Features (one per line)</Label>
            <Textarea
              id="plan-features"
              rows={4}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder={"Point of Sale\nInventory management\n..."}
            />
          </div>

          <div className="space-y-2">
            <Label>Module Entitlements</Label>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_MODULES.map((slug) => (
                <label key={slug} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.modules?.includes(slug)}
                    onCheckedChange={() => toggleModule(slug)}
                  />
                  {slug.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="plan-highlighted"
              checked={form.is_highlighted}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_highlighted: v }))}
            />
            <Label htmlFor="plan-highlighted">Highlighted (recommended badge)</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-sort">Sort Order</Label>
            <Input
              id="plan-sort"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function PlanList() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanConfig | null | undefined>(
    undefined,
  );

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
    (acc, cat) => {
      acc[cat] = plans.filter((p) => p.category === cat);
      return acc;
    },
    { pos: [], erp: [], crm: [], hr: [], bundle: [] },
  );

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage pricing, features, and module entitlements for each plan.
            </p>
          </div>
          <Button onClick={() => setEditingPlan(null)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>

        {/* Plan table per category */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          (Object.keys(CATEGORY_LABELS) as PlanCategory[]).map((cat) => {
            const rows = grouped[cat];
            if (rows.length === 0) return null;
            return (
              <div key={cat} className="rounded-lg border border-border/80">
                <div className="border-b border-border/80 bg-muted/40 px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABELS[cat]}
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
                      <TableHead>Modules</TableHead>
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
                          <div className="flex flex-wrap gap-1">
                            {(plan.modules ?? []).map((m) => (
                              <Badge key={m} variant="outline" className="text-[10px]">
                                {m.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={plan.is_active}
                              onCheckedChange={(v) =>
                                toggleMutation.mutate({ slug: plan.slug, isActive: v })
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPlan(plan)}
                            aria-label={`Edit ${plan.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
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

      {/* Edit / Create dialog — editingPlan===undefined means closed */}
      {editingPlan !== undefined && (
        <EditPlanDialog
          open
          plan={editingPlan}
          onClose={() => setEditingPlan(undefined)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["system-admin", "plans"] });
            setEditingPlan(undefined);
          }}
        />
      )}
    </PageMotion>
  );
}
