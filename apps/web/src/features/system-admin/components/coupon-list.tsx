"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { Plus, Copy, Check, Pencil } from "lucide-react";
import type { Coupon, CouponType, CreateCouponRequest, UpdateCouponRequest } from "../types";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className="ml-1.5 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function StatusBadge({ isActive, activeLabel, inactiveLabel }: { isActive: boolean; activeLabel: string; inactiveLabel: string }) {
  return (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? activeLabel : inactiveLabel}
    </Badge>
  );
}

type CouponFormState = CreateCouponRequest;
type DiscountType = NonNullable<CouponFormState["discount_type"]>;

function createEmptyCouponForm(): CouponFormState {
  return {
    description: "",
    coupon_type: "full_access",
    discount_type: "trial",
    discount_value: 0,
    max_user_count: undefined,
    lock_user_count: false,
    package_price_monthly_idr: 0,
    package_price_yearly_idr: 0,
    scope: "general",
    target_plan_slug: "",
    duration_days: 30,
    max_uses: 100,
    max_uses_per_email: 1,
    expires_at: null,
  };
}

function couponToForm(coupon?: Coupon | null): CouponFormState {
  if (!coupon) return createEmptyCouponForm();
  return {
    description: coupon.description,
    coupon_type: coupon.coupon_type,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    max_user_count: coupon.max_user_count,
    lock_user_count: coupon.lock_user_count,
    package_price_monthly_idr: coupon.package_price_monthly_idr,
    package_price_yearly_idr: coupon.package_price_yearly_idr,
    scope: coupon.scope,
    target_plan_slug: coupon.target_plan_slug ?? "",
    duration_days: coupon.duration_days,
    max_uses: coupon.max_uses,
    max_uses_per_email: coupon.max_uses_per_email ?? 1,
    expires_at: coupon.expires_at,
  };
}

interface CouponDialogProps {
  open: boolean;
  mode: "create" | "edit";
  coupon?: Coupon | null;
  onClose: () => void;
  onSaved: () => void;
}

function CouponDialog({ open, mode, coupon, onClose, onSaved }: CouponDialogProps) {
  const t = useTranslations("systemAdmin.coupons");
  const couponTypeLabels: Record<CouponType, string> = {
    full_access: t("fullAccess"),
    pos_only: t("posOnly"),
    erp_only: t("erpOnly"),
    crm_only: t("crmOnly"),
    hr_only: t("hrOnly"),
  };
  const [form, setForm] = useState<CouponFormState>(() => couponToForm(coupon));
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const discountType = form.discount_type ?? "trial";
  const isTrial = discountType === "trial";
  const isTierSpecific = (form.scope ?? "general") === "tier_specific";

  const mutation = useMutation({
    mutationFn: (payload: CouponFormState) => {
      if (mode === "edit" && coupon) {
        return systemAdminService.updateCoupon(coupon.id, payload as UpdateCouponRequest);
      }
      return systemAdminService.createCoupon(payload);
    },
    onSuccess: () => {
      onSaved();
      onClose();
      setForm(couponToForm(null));
      setError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message ?? t("saveFailed"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.description.trim()) {
      setError(t("descriptionRequired"));
      return;
    }
    if (form.duration_days < 1) {
      setError(t("durationMin"));
      return;
    }
    if (form.max_uses && form.max_uses < 1) {
      setError(t("maxUsesMin"));
      return;
    }

    if (isTierSpecific && !form.target_plan_slug?.trim()) {
      setError(`${t("targetPlanSlug")} is required`);
      return;
    }

    if (!isTrial && (form.discount_value ?? 0) <= 0) {
      setError(`${t("discountValue")} must be greater than 0`);
      return;
    }

    if (discountType === "percent" && (form.discount_value ?? 0) > 100) {
      setError(`${t("discountValue")} must be at most 100`);
      return;
    }

    mutation.mutate(form);
  };

  const handleDiscountTypeChange = (value: DiscountType) => {
    setForm((prev) => {
      if (value === "trial") {
        return {
          ...prev,
          discount_type: value,
          discount_value: 0,
        };
      }

      return {
        ...prev,
        discount_type: value,
        discount_value: prev.discount_value && prev.discount_value > 0 ? prev.discount_value : 10,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-screen max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? t("editCoupon") : t("generateNewCoupon")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {mode === "edit" && coupon && (
            <div className="space-y-1.5">
              <Label>{t("couponCode")}</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-mono tracking-widest text-muted-foreground">
                {coupon.code}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="c-desc">{t("descriptionColumn")}</Label>
            <Textarea
              id="c-desc"
              placeholder={t("descriptionPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
            <Label>{t("discountType")}</Label>
            <div className="grid gap-2 md:grid-cols-3">
              <Button
                type="button"
                variant={discountType === "trial" ? "default" : "outline"}
                onClick={() => handleDiscountTypeChange("trial")}
              >
                {t("trial")}
              </Button>
              <Button
                type="button"
                variant={discountType === "percent" ? "default" : "outline"}
                onClick={() => handleDiscountTypeChange("percent")}
              >
                {t("percent")}
              </Button>
              <Button
                type="button"
                variant={discountType === "amount" ? "default" : "outline"}
                onClick={() => handleDiscountTypeChange("amount")}
              >
                {t("amount")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isTrial
                ? "Trial coupon: fokus ke masa aktif akses, tanpa nilai diskon."
                : "Discount coupon: isi nilai diskon agar potongan berlaku."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-type">{t("couponType")}</Label>
              <Select
                value={form.coupon_type}
                onValueChange={(v) => setForm((p) => ({ ...p, coupon_type: v as CouponType }))}
              >
                <SelectTrigger id="c-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(couponTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-scope">{t("scope")}</Label>
              <Select
                value={form.scope ?? "general"}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    scope: v as CouponFormState["scope"],
                    target_plan_slug: v === "tier_specific" ? p.target_plan_slug : "",
                  }))
                }
              >
                <SelectTrigger id="c-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("general")}</SelectItem>
                  <SelectItem value="tier_specific">{t("tierSpecific")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isTierSpecific && (
            <div className="space-y-1.5">
              <Label htmlFor="c-target">{t("targetPlanSlug")}</Label>
              <Input
                id="c-target"
                placeholder="pos_growth"
                value={form.target_plan_slug ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, target_plan_slug: e.target.value }))}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {!isTrial && (
              <div className="space-y-1.5">
                <Label htmlFor="c-discount">{t("discountValue")}</Label>
                <Input
                  id="c-discount"
                  type="number"
                  min={0}
                  max={discountType === "percent" ? 100 : undefined}
                  step="1"
                  value={form.discount_value ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, discount_value: Number(e.target.value) }))}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="c-days">{t("durationDays")}</Label>
              <Input
                id="c-days"
                type="number"
                min={1}
                max={36500}
                value={form.duration_days}
                onChange={(e) => setForm((p) => ({ ...p, duration_days: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-max-users">{t("maxUserCount")}</Label>
              <Input
                id="c-max-users"
                type="number"
                min={1}
                max={500}
                value={form.max_user_count ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((p) => ({ ...p, max_user_count: value ? Number(value) : undefined }));
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-lock-users">{t("lockUserCount")}</Label>
            <div className="flex h-10 items-center rounded-md border px-3">
              <Switch
                id="c-lock-users"
                checked={!!form.lock_user_count}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, lock_user_count: checked }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-0 text-sm"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="c-package-monthly">{t("packagePriceMonthly")}</Label>
                  <Input
                    id="c-package-monthly"
                    type="number"
                    min={0}
                    step="1000"
                    value={form.package_price_monthly_idr ?? 0}
                    onChange={(e) => setForm((p) => ({ ...p, package_price_monthly_idr: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-package-yearly">{t("packagePriceYearly")}</Label>
                  <Input
                    id="c-package-yearly"
                    type="number"
                    min={0}
                    step="1000"
                    value={form.package_price_yearly_idr ?? 0}
                    onChange={(e) => setForm((p) => ({ ...p, package_price_yearly_idr: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-uses">{t("maxUses")}</Label>
                  <Input
                    id="c-uses"
                    type="number"
                    min={1}
                    max={99999}
                    value={form.max_uses ?? 0}
                    onChange={(e) => setForm((p) => ({ ...p, max_uses: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-uses-email">{t("maxUsesPerEmail")}</Label>
                  <Input
                    id="c-uses-email"
                    type="number"
                    min={1}
                    max={100}
                    value={form.max_uses_per_email ?? 1}
                    onChange={(e) => setForm((p) => ({ ...p, max_uses_per_email: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-expires">{t("expiresAt")}</Label>
                  <Input
                    id="c-expires"
                    type="date"
                    value={form.expires_at?.split("T")[0] ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        expires_at: e.target.value ? `${e.target.value}T23:59:59Z` : null,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (mode === "edit" ? t("saving") : t("generating")) : (mode === "edit" ? t("saveChanges") : t("generate"))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CouponList() {
  const t = useTranslations("systemAdmin.coupons");
  const couponTypeLabels: Record<CouponType, string> = {
    full_access: t("fullAccess"),
    pos_only: t("posOnly"),
    erp_only: t("erpOnly"),
    crm_only: t("crmOnly"),
    hr_only: t("hrOnly"),
  };
  const [activeOnly, setActiveOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sys-coupons", { activeOnly }],
    queryFn: () => systemAdminService.getCoupons({ active_only: activeOnly || undefined }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      systemAdminService.setCouponStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sys-coupons"] }),
  });

  const coupons = data?.data ?? [];

  if (isError) {
    return (
      <PageMotion>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {t("failedToLoad")}
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <div className="space-y-6 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("generateCoupon")}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Label htmlFor="active-filter" className="text-sm font-normal">
            {t("activeOnly")}
          </Label>
          <Switch
            id="active-filter"
            checked={activeOnly}
            onCheckedChange={setActiveOnly}
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    {t("noCoupons")}
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon: Coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono text-sm font-semibold tracking-widest">
                      {coupon.code}
                      <CopyButton text={coupon.code} label={t("copyCouponCode")} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                      {coupon.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {couponTypeLabels[coupon.coupon_type] ?? coupon.coupon_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="space-y-1">
                        <p>{coupon.max_user_count ? `Up to ${coupon.max_user_count} users` : "Unlimited users"}</p>
                        {coupon.lock_user_count && (
                          <p className="text-xs">{t("usersLocked")}</p>
                        )}
                        {coupon.package_price_monthly_idr && coupon.package_price_monthly_idr > 0 && (
                          <p className="text-xs">
                            {t("packageMonthly", { price: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(coupon.package_price_monthly_idr) })}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon.duration_days >= 36500 ? "Lifetime" : `${coupon.duration_days}d`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon.used_count} / {coupon.max_uses}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {coupon.expires_at
                        ? new Date(coupon.expires_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={coupon.is_active} activeLabel={t("active")} inactiveLabel={t("inactive")} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={coupon.is_active}
                          disabled={toggleStatus.isPending}
                          onCheckedChange={(checked) =>
                            toggleStatus.mutate({ id: coupon.id, isActive: checked })
                          }
                          aria-label={`${t("status")} ${coupon.code}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCoupon(coupon);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CouponDialog
        key={createOpen ? "create-coupon-open" : "create-coupon-closed"}
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["sys-coupons"] })}
      />
      <CouponDialog
        key={`${editingCoupon?.id ?? "edit-coupon"}-${editOpen ? "open" : "closed"}`}
        open={editOpen}
        mode="edit"
        coupon={editingCoupon}
        onClose={() => {
          setEditOpen(false);
          setEditingCoupon(null);
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["sys-coupons"] })}
      />
    </PageMotion>
  );
}
