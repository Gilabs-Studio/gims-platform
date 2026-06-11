"use client";

import { useMemo, useState } from "react";
import { PageMotion } from "@/components/motion/page-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/features/finance/assets/components/date-picker";
import { AsyncSelect } from "@/components/ui/async-select";
import { Copy, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useSalesReferralAccounts,
  useActiveCoupons,
  useReferralCommissionConfig,
  useReferralCommissions,
  useReferralPayouts,
  useSalesReferralCodes,
  useSalesReferralMutations,
  useSalesReferralStats,
} from "../hooks/use-sales-referrals";
import type {
  CreateSalesReferralAccountRequest,
  CreateSalesReferralCodeRequest,
  SalesReferralAccount,
  SalesReferralCode,
  ReferralCommission,
  Coupon,
  UpdateSalesReferralAccountRequest,
  UpdateSalesReferralCodeRequest,
} from "../types";

type AccountFormState = {
  email: string;
  name: string;
  isActive: boolean;
};

type CodeFormState = {
  salesReferralAccountID: string;
  couponID: string;
  code: string;
  campaignName: string;
  description: string;
  isActive: boolean;
  maxUses: number;
  maxUsesPerEmail: number;
  closeCommissionPercent: number;
  recurringCommissionPercent: number;
  expiresAt: string;
};

type ReferralFilter = "all" | "active" | "inactive";

function RequiredMark() {
  return <span className="ml-0.5 text-destructive">*</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function getEmailError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (/\s/.test(trimmed)) return "Email cannot contain spaces.";
  if (!trimmed.includes("@")) return "Email must include @.";
  const [local, domain, extra] = trimmed.split("@");
  if (extra !== undefined) return "Email can only include one @ symbol.";
  if (!local) return "Email must include text before @.";
  if (!domain) return "Email must include a domain after @.";
  if (!domain.includes(".")) return "Email domain must include a dot, like example.com.";
  if (domain.startsWith(".") || domain.endsWith(".")) return "Email domain cannot start or end with a dot.";
  if (trimmed.length > 254) return "Email must be 254 characters or fewer.";
  return undefined;
}

function getPublicCodeError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Public code is required.";
  if (trimmed.length < 4) return "Public code must be at least 4 characters.";
  if (trimmed.length > 64) return "Public code must be 64 characters or fewer.";
  if (/\s/.test(trimmed)) return "Public code cannot contain spaces.";
  if (!/^[A-Z0-9_-]+$/.test(trimmed.toUpperCase())) return "Use only letters, numbers, underscores, or hyphens.";
  return undefined;
}

function getPositiveIntegerError(value: number, label: string): string | undefined {
  if (!Number.isFinite(value)) return `${label} is required.`;
  if (!Number.isInteger(value)) return `${label} must be a whole number.`;
  if (value < 1) return `${label} must be at least 1.`;
  if (value > 1000000) return `${label} must be 1,000,000 or fewer.`;
  return undefined;
}

function getCommissionPercentError(value: number, label: string): string | undefined {
  if (!Number.isFinite(value)) return `${label} is required.`;
  if (value < 0) return `${label} cannot be negative.`;
  if (value > 100) return `${label} cannot exceed 100%.`;
  return undefined;
}

function bpsToPercent(value: number): number {
  return value / 100;
}

function percentToBps(value: number): number {
  return Math.round(value * 100);
}

function formatBpsPercent(value: number): string {
  return `${value / 100}%`;
}

function shortID(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}

function accountForm(account?: SalesReferralAccount | null): AccountFormState {
  return {
    email: account?.email ?? "",
    name: account?.name ?? "",
    isActive: account?.is_active ?? true,
  };
}

function codeForm(code?: SalesReferralCode | null, defaults?: { closeBps: number; recurringBps: number }): CodeFormState {
  return {
    salesReferralAccountID: code?.sales_referral_account_id ?? "",
    couponID: code?.coupon_id ?? "",
    code: code?.code ?? "",
    campaignName: code?.campaign_name ?? "",
    description: code?.description ?? "",
    isActive: code?.is_active ?? true,
    maxUses: code?.max_uses ?? 100,
    maxUsesPerEmail: code?.max_uses_per_email ?? 1,
    closeCommissionPercent: bpsToPercent(code?.close_commission_bps ?? defaults?.closeBps ?? 3000),
    recurringCommissionPercent: bpsToPercent(code?.recurring_commission_bps ?? defaults?.recurringBps ?? 300),
    expiresAt: code?.expires_at ? code.expires_at.slice(0, 10) : "",
  };
}

function CopyButton({ text }: { text: string }) {
  const copy = async () => navigator.clipboard.writeText(text);
  return (
    <button
      type="button"
      aria-label="Copy code"
      className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
      onClick={copy}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>;
}

interface AccountDialogProps {
  open: boolean;
  account: SalesReferralAccount | null;
  onClose: () => void;
  onSubmit: (payload: CreateSalesReferralAccountRequest | UpdateSalesReferralAccountRequest) => void;
  isSaving: boolean;
}

function AccountDialog({ open, account, onClose, onSubmit, isSaving }: AccountDialogProps) {
  const [form, setForm] = useState<AccountFormState>(() => accountForm(account));
  const [errors, setErrors] = useState<Partial<Record<keyof AccountFormState, string>>>({});
  const isEdit = Boolean(account);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof AccountFormState, string>> = {};
    const emailError = getEmailError(form.email);
    if (emailError) nextErrors.email = emailError;
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (typeof form.isActive !== "boolean") nextErrors.isActive = "Active status is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      is_active: form.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit referral account" : "Create referral account"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="ref-account-email">Email<RequiredMark /></Label>
            <Input
              id="ref-account-email"
              type="email"
              value={form.email}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, email: event.target.value }));
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            <FieldError message={errors.email} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref-account-name">Name<RequiredMark /></Label>
            <Input
              id="ref-account-name"
              value={form.name}
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }));
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            <FieldError message={errors.name} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="ref-account-active">Active<RequiredMark /></Label>
            <Switch
              id="ref-account-active"
              checked={form.isActive}
              onCheckedChange={(checked) => {
                setForm((prev) => ({ ...prev, isActive: checked }));
                setErrors((prev) => ({ ...prev, isActive: undefined }));
              }}
            />
          </div>
          <FieldError message={errors.isActive} />
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="cursor-pointer" disabled={isSaving}>{isSaving ? "Saving..." : "Save account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CodeDialogProps {
  open: boolean;
  code: SalesReferralCode | null;
  accounts: SalesReferralAccount[];
  coupons: Coupon[];
  onClose: () => void;
  onSubmit: (payload: CreateSalesReferralCodeRequest | UpdateSalesReferralCodeRequest) => void;
  isSaving: boolean;
  defaultCloseCommissionBps: number;
  defaultRecurringCommissionBps: number;
}

function CodeDialog({ open, code, accounts, coupons, onClose, onSubmit, isSaving, defaultCloseCommissionBps, defaultRecurringCommissionBps }: CodeDialogProps) {
  const [form, setForm] = useState<CodeFormState>(() => codeForm(code, { closeBps: defaultCloseCommissionBps, recurringBps: defaultRecurringCommissionBps }));
  const [errors, setErrors] = useState<Partial<Record<keyof CodeFormState, string>>>({});
  const isEdit = Boolean(code);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof CodeFormState, string>> = {};
    if (!form.salesReferralAccountID) nextErrors.salesReferralAccountID = "Sales account is required.";
    if (!form.couponID) nextErrors.couponID = "Wrapped coupon is required.";
    const codeError = getPublicCodeError(form.code);
    if (codeError) nextErrors.code = codeError;
    const maxUsesError = getPositiveIntegerError(form.maxUses, "Max uses");
    if (maxUsesError) nextErrors.maxUses = maxUsesError;
    const maxUsesPerEmailError = getPositiveIntegerError(form.maxUsesPerEmail, "Max uses per email");
    if (maxUsesPerEmailError) nextErrors.maxUsesPerEmail = maxUsesPerEmailError;
    const closeCommissionError = getCommissionPercentError(form.closeCommissionPercent, "Close commission");
    if (closeCommissionError) nextErrors.closeCommissionPercent = closeCommissionError;
    const recurringCommissionError = getCommissionPercentError(form.recurringCommissionPercent, "Recurring commission");
    if (recurringCommissionError) nextErrors.recurringCommissionPercent = recurringCommissionError;
    if (typeof form.isActive !== "boolean") nextErrors.isActive = "Active status is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const expiresAt = form.expiresAt ? new Date(`${form.expiresAt}T23:59:59Z`).toISOString() : null;
    onSubmit({
      sales_referral_account_id: form.salesReferralAccountID,
      coupon_id: form.couponID,
      code: form.code.trim().toUpperCase(),
      campaign_name: form.campaignName.trim() || null,
      description: form.description.trim() || null,
      is_active: form.isActive,
      max_uses: form.maxUses,
      max_uses_per_email: form.maxUsesPerEmail,
      close_commission_bps: percentToBps(form.closeCommissionPercent),
      recurring_commission_bps: percentToBps(form.recurringCommissionPercent),
      expires_at: expiresAt,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit referral code" : "Create referral code"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-account">Sales account<RequiredMark /></Label>
              <Select
                value={form.salesReferralAccountID}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, salesReferralAccountID: value }));
                  setErrors((prev) => ({ ...prev, salesReferralAccountID: undefined }));
                }}
              >
                <SelectTrigger id="ref-code-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>
                    Select account
                  </SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name || account.email}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.salesReferralAccountID} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-coupon">Wrapped coupon<RequiredMark /></Label>
              <Select
                value={form.couponID}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, couponID: value }));
                  setErrors((prev) => ({ ...prev, couponID: undefined }));
                  const selectedCoupon = coupons.find((coupon) => coupon.id === value);
                  const couponExpiry = selectedCoupon?.expires_at;
                  if (couponExpiry) {
                    setForm((prev) => ({ ...prev, expiresAt: couponExpiry.slice(0, 10) }));
                  }
                }}
              >
                <SelectTrigger id="ref-code-coupon">
                  <SelectValue placeholder="Select coupon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>
                    Select coupon
                  </SelectItem>
                {coupons.map((coupon) => (
                  <SelectItem key={coupon.id} value={coupon.id}>
                    {coupon.code} · {coupon.description || coupon.coupon_type}
                  </SelectItem>
                ))}
                {code && !coupons.some((coupon) => coupon.id === code.coupon_id) && (
                  <SelectItem value={code.coupon_id}>
                    {code.coupon_id} · current linked coupon
                  </SelectItem>
                )}
                </SelectContent>
              </Select>
              <FieldError message={errors.couponID} />
              <p className="text-xs text-muted-foreground">Referral code inherits discount/trial rules from selected coupon.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-code">Public code<RequiredMark /></Label>
              <Input
                id="ref-code-code"
                value={form.code}
                aria-invalid={Boolean(errors.code)}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }));
                  setErrors((prev) => ({ ...prev, code: undefined }));
                }}
              />
              <FieldError message={errors.code} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-campaign">Campaign name</Label>
              <Input
                id="ref-code-campaign"
                value={form.campaignName}
                onChange={(event) => setForm((prev) => ({ ...prev, campaignName: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref-code-desc">Description</Label>
            <Textarea
              id="ref-code-desc"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-max">Max uses<RequiredMark /></Label>
              <Input
                id="ref-code-max"
                type="number"
                min={1}
                value={form.maxUses}
                aria-invalid={Boolean(errors.maxUses)}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, maxUses: Number(event.target.value) }));
                  setErrors((prev) => ({ ...prev, maxUses: undefined }));
                }}
              />
              <FieldError message={errors.maxUses} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-max-email">Max uses / email<RequiredMark /></Label>
              <Input
                id="ref-code-max-email"
                type="number"
                min={1}
                value={form.maxUsesPerEmail}
                aria-invalid={Boolean(errors.maxUsesPerEmail)}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, maxUsesPerEmail: Number(event.target.value) }));
                  setErrors((prev) => ({ ...prev, maxUsesPerEmail: undefined }));
                }}
              />
              <FieldError message={errors.maxUsesPerEmail} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-expiry">Expires at</Label>
              <DatePicker
                id="ref-code-expiry"
                value={form.expiresAt}
                onChange={(value) => setForm((prev) => ({ ...prev, expiresAt: value }))}
              />
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-3">
              <div className="text-sm font-medium">Commission settings</div>
              <p className="text-xs text-muted-foreground">Rates are stored on this referral code. Defaults come from current commission defaults.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ref-code-close-commission">Close commission (%)<RequiredMark /></Label>
                <Input
                  id="ref-code-close-commission"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.closeCommissionPercent}
                  aria-invalid={Boolean(errors.closeCommissionPercent)}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, closeCommissionPercent: Number(event.target.value) }));
                    setErrors((prev) => ({ ...prev, closeCommissionPercent: undefined }));
                  }}
                />
                <FieldError message={errors.closeCommissionPercent} />
                <p className="text-xs text-muted-foreground">{form.closeCommissionPercent}% for first paid transaction.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-code-recurring-commission">Recurring commission (%)<RequiredMark /></Label>
                <Input
                  id="ref-code-recurring-commission"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.recurringCommissionPercent}
                  aria-invalid={Boolean(errors.recurringCommissionPercent)}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, recurringCommissionPercent: Number(event.target.value) }));
                    setErrors((prev) => ({ ...prev, recurringCommissionPercent: undefined }));
                  }}
                />
                <FieldError message={errors.recurringCommissionPercent} />
                <p className="text-xs text-muted-foreground">{form.recurringCommissionPercent}% for renewal transactions.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="ref-code-active">Active<RequiredMark /></Label>
            <Switch
              id="ref-code-active"
              checked={form.isActive}
              onCheckedChange={(checked) => {
                setForm((prev) => ({ ...prev, isActive: checked }));
                setErrors((prev) => ({ ...prev, isActive: undefined }));
              }}
            />
          </div>
          <FieldError message={errors.isActive} />
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="cursor-pointer" disabled={isSaving}>{isSaving ? "Saving..." : "Save code"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CommissionMiniTable({ rows, emptyText }: { rows: ReferralCommission[]; emptyText: string }) {
  if (rows.length === 0) return <p className="rounded-md border p-4 text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Base</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Payment TX</TableHead>
            <TableHead>Earned</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="capitalize">{row.commission_type}</TableCell>
              <TableCell><Badge variant={row.status === "pending" ? "secondary" : row.status === "approved" ? "default" : "outline"}>{row.status}</Badge></TableCell>
              <TableCell>{formatIDR(row.source_net_amount_idr)}</TableCell>
              <TableCell>{formatBpsPercent(row.commission_bps)}</TableCell>
              <TableCell>{formatIDR(row.commission_amount_idr)}</TableCell>
              <TableCell className="font-mono text-xs">{shortID(row.payment_transaction_id)}</TableCell>
              <TableCell>{formatDate(row.earned_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CodeDetailDialog({ code, commissions, onClose }: { code: SalesReferralCode | null; commissions: ReferralCommission[]; onClose: () => void }) {
  if (!code) return null;
  return (
    <Dialog open={Boolean(code)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Referral code detail</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Code</p><p className="font-mono font-medium">{code.code}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge active={code.is_active} /></div>
              <div><p className="text-xs text-muted-foreground">Sales account</p><p>{code.sales_referral_account?.name || code.sales_referral_account?.email || code.sales_referral_account_id}</p></div>
              <div><p className="text-xs text-muted-foreground">Campaign</p><p>{code.campaign_name || "-"}</p></div>
              <div><p className="text-xs text-muted-foreground">Usage</p><p>{code.used_count}/{code.max_uses} · {code.max_uses_per_email}/email</p></div>
              <div><p className="text-xs text-muted-foreground">Expires</p><p>{formatDate(code.expires_at)}</p></div>
              <div><p className="text-xs text-muted-foreground">Close commission</p><p>{formatBpsPercent(code.close_commission_bps)}</p></div>
              <div><p className="text-xs text-muted-foreground">Recurring commission</p><p>{formatBpsPercent(code.recurring_commission_bps)}</p></div>
            </div>
            <div><p className="text-xs text-muted-foreground">Description</p><p>{code.description || "-"}</p></div>
          </TabsContent>
          <TabsContent value="commissions" className="pt-4">
            <CommissionMiniTable rows={commissions} emptyText="No commissions for this code yet." />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AccountDetailDialog({ account, codes, commissions, onClose }: { account: SalesReferralAccount | null; codes: SalesReferralCode[]; commissions: ReferralCommission[]; onClose: () => void }) {
  if (!account) return null;
  return (
    <Dialog open={Boolean(account)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sales account detail</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="codes">Codes</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Name</p><p>{account.name || "-"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge active={account.is_active} /></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p>{account.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p>{formatDate(account.created_at)}</p></div>
            </div>
          </TabsContent>
          <TabsContent value="codes" className="pt-4">
            {codes.length === 0 ? <p className="rounded-md border p-4 text-sm text-muted-foreground">No codes for this account yet.</p> : (
              <div className="space-y-2">
                {codes.map((code) => (
                  <div key={code.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div><p className="font-mono font-medium">{code.code}</p><p className="text-muted-foreground">{code.campaign_name || "No campaign"}</p></div>
                    <div className="text-right text-xs text-muted-foreground">Close {formatBpsPercent(code.close_commission_bps)}<br />Recurring {formatBpsPercent(code.recurring_commission_bps)}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="commissions" className="pt-4">
            <CommissionMiniTable rows={commissions} emptyText="No commissions for this account yet." />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteDialog({ open, title, description, confirmLabel, loading, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(value) => !value && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Deleting..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SalesReferralList() {
  const [accountPage, setAccountPage] = useState(1);
  const [codePage, setCodePage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [activeTab, setActiveTab] = useState<"codes" | "accounts" | "commissions" | "payouts">("codes");
  const [codeFilter, setCodeFilter] = useState<ReferralFilter>("all");
  const [accountFilter, setAccountFilter] = useState<ReferralFilter>("all");
  const [accountDialog, setAccountDialog] = useState<SalesReferralAccount | null | "create">(null);
  const [codeDialog, setCodeDialog] = useState<SalesReferralCode | null | "create">(null);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<SalesReferralAccount | null>(null);
  const [deleteCodeTarget, setDeleteCodeTarget] = useState<SalesReferralCode | null>(null);
  const [detailAccount, setDetailAccount] = useState<SalesReferralAccount | null>(null);
  const [detailCode, setDetailCode] = useState<SalesReferralCode | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAccountID, setPayoutAccountID] = useState("");
  const [payoutCommissionIDs, setPayoutCommissionIDs] = useState<string[]>([]);
  const [payoutReference, setPayoutReference] = useState("");
  const [selectedPayoutCommissionID, setSelectedPayoutCommissionID] = useState("");
  const [voidTarget, setVoidTarget] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("Manual admin void");
  const params = useMemo(() => ({ page: 1, per_page: 20, search: debouncedSearch.trim() || undefined }), [debouncedSearch]);
  const stats = useSalesReferralStats();
  const accounts = useSalesReferralAccounts({ ...params, page: accountPage });
  const codes = useSalesReferralCodes({ ...params, page: codePage });
  const commissionConfig = useReferralCommissionConfig();
  const commissions = useReferralCommissions({ page: 1, per_page: 20 });
  const payouts = useReferralPayouts({ page: 1, per_page: 20 });
  const coupons = useActiveCoupons();
  const mutations = useSalesReferralMutations();
  const accountRows = useMemo(() => accounts.data?.data ?? [], [accounts.data?.data]);
  const codeRows = useMemo(() => codes.data?.data ?? [], [codes.data?.data]);
  const accountDialogValue = accountDialog === "create" ? null : accountDialog;
  const codeDialogValue = codeDialog === "create" ? null : codeDialog;
  const isAccountSaving = mutations.createAccount.isPending || mutations.updateAccount.isPending;
  const isCodeSaving = mutations.createCode.isPending || mutations.updateCode.isPending;

  const filteredAccounts = useMemo(
    () => accountRows.filter((row) => accountFilter === "all" ? true : accountFilter === "active" ? row.is_active : !row.is_active),
    [accountRows, accountFilter],
  );
  const filteredCodes = useMemo(
    () => codeRows.filter((row) => codeFilter === "all" ? true : codeFilter === "active" ? row.is_active : !row.is_active),
    [codeRows, codeFilter],
  );
  const commissionRows = useMemo(() => commissions.data?.data ?? [], [commissions.data?.data]);
  const approvedCommissionRows = useMemo(() => commissionRows.filter((row) => row.status === "approved"), [commissionRows]);
  const approvedCommissionRowsByAccount = useMemo(
    () => approvedCommissionRows.filter((row) => !payoutAccountID || row.sales_referral_account_id === payoutAccountID),
    [approvedCommissionRows, payoutAccountID],
  );
  const selectedPayoutCommissions = useMemo(
    () => approvedCommissionRows.filter((row) => payoutCommissionIDs.includes(row.id)),
    [approvedCommissionRows, payoutCommissionIDs],
  );
  const detailCodeCommissions = useMemo(
    () => detailCode ? commissionRows.filter((row) => row.sales_referral_code_id === detailCode.id) : [],
    [commissionRows, detailCode],
  );
  const detailAccountCodes = useMemo(
    () => detailAccount ? codeRows.filter((row) => row.sales_referral_account_id === detailAccount.id) : [],
    [codeRows, detailAccount],
  );
  const detailAccountCommissions = useMemo(
    () => detailAccount ? commissionRows.filter((row) => row.sales_referral_account_id === detailAccount.id) : [],
    [commissionRows, detailAccount],
  );
  const currentFilter = activeTab === "codes" ? codeFilter : accountFilter;
  const setCurrentFilter = (value: ReferralFilter) => {
    if (activeTab === "codes") setCodeFilter(value);
    else setAccountFilter(value);
  };

  return (
    <PageMotion>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sales Referrals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage sales accounts, referral codes, and conversion attribution.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Leads", stats.data?.total_leads ?? 0],
            ["Conversions", stats.data?.total_conversions ?? 0],
            ["Trial", stats.data?.trial_conversions ?? 0],
            ["Net revenue", formatIDR(stats.data?.net_revenue_idr ?? 0)],
          ].map(([label, value]) => (
            <Card key={label} className="py-1.5">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-3xl font-semibold leading-none">{stats.isLoading ? <Skeleton className="h-9 w-24" /> : value}</div>
              </CardContent>
            </Card>
          ))}
        </div>


        <Tabs defaultValue="codes" onValueChange={(value) => setActiveTab(value as "codes" | "accounts" | "commissions" | "payouts")}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="codes">Codes</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
            </TabsList>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
              {(activeTab === "codes" || activeTab === "accounts") && <>
              <div className="relative flex-1 lg:max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search account, email, code, or campaign..."
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setAccountPage(1);
                    setCodePage(1);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setSearchInput(searchInput.trim());
                  }}
                />
              </div>
              <Select value={currentFilter} onValueChange={(value: ReferralFilter) => setCurrentFilter(value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              </>}
              {activeTab === "codes" ? (
                <Button className="cursor-pointer gap-2" onClick={() => setCodeDialog("create")}>
                  <Plus className="h-4 w-4" /> Code
                </Button>
              ) : activeTab === "accounts" ? (
                <Button className="cursor-pointer gap-2" onClick={() => setAccountDialog("create")}>
                  <Plus className="h-4 w-4" /> Account
                </Button>
              ) : activeTab === "payouts" ? (
                <Button className="cursor-pointer gap-2" onClick={() => setPayoutDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Payout
                </Button>
              ) : null}
            </div>
          </div>

          <TabsContent value="codes" className="pt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Sales account</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.isLoading ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}><TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                  )) : filteredCodes.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No referral codes found.</TableCell></TableRow>
                  ) : filteredCodes.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell><div className="flex items-center gap-2 font-mono font-medium">{row.code}<CopyButton text={row.code} /></div></TableCell>
                      <TableCell>{row.sales_referral_account?.name || row.sales_referral_account?.email || row.sales_referral_account_id}</TableCell>
                      <TableCell>{row.campaign_name || "-"}</TableCell>
                      <TableCell>{row.used_count}/{row.max_uses}</TableCell>
                      <TableCell>
                        <div className="text-xs leading-5">
                          <div><span className="text-muted-foreground">Close</span> {formatBpsPercent(row.close_commission_bps)}</div>
                          <div><span className="text-muted-foreground">Recurring</span> {formatBpsPercent(row.recurring_commission_bps)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(row.expires_at)}</TableCell>
                      <TableCell><StatusBadge active={row.is_active} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setDetailCode(row)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setCodeDialog(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="cursor-pointer text-destructive" onClick={() => setDeleteCodeTarget(row)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="pt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.isLoading ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                  )) : filteredAccounts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No referral accounts found.</TableCell></TableRow>
                  ) : filteredAccounts.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name || "-"}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell><StatusBadge active={row.is_active} /></TableCell>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setDetailAccount(row)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setAccountDialog(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="cursor-pointer text-destructive" onClick={() => setDeleteAccountTarget(row)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="commissions" className="pt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Payment TX</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.isLoading ? Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}><TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                  )) : (commissions.data?.data ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No commissions found.</TableCell></TableRow>
                  ) : (commissions.data?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="capitalize">{row.commission_type}</TableCell>
                      <TableCell><Badge variant={row.status === "pending" ? "secondary" : row.status === "approved" ? "default" : "outline"}>{row.status}</Badge></TableCell>
                      <TableCell>{formatIDR(row.source_net_amount_idr)}</TableCell>
                      <TableCell>{formatBpsPercent(row.commission_bps)}</TableCell>
                      <TableCell>{formatIDR(row.commission_amount_idr)}</TableCell>
                      <TableCell className="font-mono text-xs">{shortID(row.payment_transaction_id)}</TableCell>
                      <TableCell>{formatDate(row.earned_at)}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button size="sm" variant="outline" disabled={row.status !== "pending" || mutations.approveCommission.isPending} onClick={() => mutations.approveCommission.mutate(row.id)}>Approve</Button>
                        <Button size="sm" variant="ghost" disabled={row.status === "paid" || mutations.voidCommission.isPending} onClick={() => setVoidTarget(row.id)}>Void</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payouts" className="pt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid at</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.isLoading ? Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                  )) : (payouts.data?.data ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No payouts found.</TableCell></TableRow>
                  ) : (payouts.data?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell><Badge>{row.status}</Badge></TableCell>
                      <TableCell>{formatIDR(row.total_amount_idr)}</TableCell>
                      <TableCell>{formatDate(row.paid_at)}</TableCell>
                      <TableCell>{row.payment_reference || "-"}</TableCell>
                      <TableCell>{row.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {accountDialog !== null && (
          <AccountDialog
            open={accountDialog !== null}
            account={accountDialogValue}
            isSaving={isAccountSaving}
            onClose={() => setAccountDialog(null)}
            onSubmit={(payload) => {
              if (accountDialogValue) {
                mutations.updateAccount.mutate({ id: accountDialogValue.id, payload: payload as UpdateSalesReferralAccountRequest }, { onSuccess: () => setAccountDialog(null) });
              } else {
                mutations.createAccount.mutate(payload as CreateSalesReferralAccountRequest, { onSuccess: () => setAccountDialog(null) });
              }
            }}
          />
        )}
        {codeDialog !== null && (
          <CodeDialog
            open={codeDialog !== null}
            code={codeDialogValue}
            accounts={accountRows}
            coupons={coupons.data ?? []}
            isSaving={isCodeSaving}
            defaultCloseCommissionBps={commissionConfig.data?.default_close_commission_bps ?? 3000}
            defaultRecurringCommissionBps={commissionConfig.data?.default_recurring_commission_bps ?? 300}
            onClose={() => setCodeDialog(null)}
            onSubmit={(payload) => {
              if (codeDialogValue) {
                mutations.updateCode.mutate({ id: codeDialogValue.id, payload: payload as UpdateSalesReferralCodeRequest }, { onSuccess: () => setCodeDialog(null) });
              } else {
                mutations.createCode.mutate(payload as CreateSalesReferralCodeRequest, { onSuccess: () => setCodeDialog(null) });
              }
            }}
          />
        )}
        <CodeDetailDialog
          code={detailCode}
          commissions={detailCodeCommissions}
          onClose={() => setDetailCode(null)}
        />
        <AccountDetailDialog
          account={detailAccount}
          codes={detailAccountCodes}
          commissions={detailAccountCommissions}
          onClose={() => setDetailAccount(null)}
        />
        <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record payout</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(event) => {
              event.preventDefault();
              mutations.createPayout.mutate({
                sales_referral_account_id: payoutAccountID,
                commission_ids: payoutCommissionIDs,
                paid_at: new Date().toISOString(),
                payment_reference: payoutReference || null,
              }, { onSuccess: () => { setPayoutAccountID(""); setPayoutCommissionIDs([]); setSelectedPayoutCommissionID(""); setPayoutReference(""); setPayoutDialogOpen(false); } });
            }}>
              <div className="space-y-1.5">
                <Label>Sales account<RequiredMark /></Label>
                <Select value={payoutAccountID} onValueChange={(value) => { setPayoutAccountID(value); setPayoutCommissionIDs([]); setSelectedPayoutCommissionID(""); }}>
                  <SelectTrigger><SelectValue placeholder="Sales account" /></SelectTrigger>
                  <SelectContent>{accountRows.map((account) => <SelectItem key={account.id} value={account.id}>{account.name || account.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-medium">Approved commissions</div>
                <AsyncSelect<ReferralCommission>
                  label="commission"
                  value={selectedPayoutCommissionID}
                  disabled={!payoutAccountID || approvedCommissionRowsByAccount.length === 0}
                  defaultOptions={approvedCommissionRowsByAccount.filter((row) => !payoutCommissionIDs.includes(row.id))}
                  fetcher={async (query) => approvedCommissionRowsByAccount.filter((row) => {
                    const haystack = `${row.id} ${row.payment_transaction_id} ${row.commission_type} ${row.commission_amount_idr}`.toLowerCase();
                    return !payoutCommissionIDs.includes(row.id) && haystack.includes(query.toLowerCase());
                  })}
                  getValue={(row) => row.id}
                  getLabel={(row) => `${shortID(row.id)} · ${formatIDR(row.commission_amount_idr)}`}
                  renderOption={(row) => (
                    <div className="flex flex-col">
                      <span>{shortID(row.id)} · {formatIDR(row.commission_amount_idr)}</span>
                      <span className="text-xs text-muted-foreground">{row.commission_type} · payment {shortID(row.payment_transaction_id)}</span>
                    </div>
                  )}
                  placeholder={payoutAccountID ? "Select approved commission" : "Select sales account first"}
                  emptyMessage="No approved commissions available."
                  onChange={(value) => {
                    setSelectedPayoutCommissionID(value);
                    setPayoutCommissionIDs((prev) => prev.includes(value) ? prev : [...prev, value]);
                    setSelectedPayoutCommissionID("");
                  }}
                />
                {selectedPayoutCommissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No commissions selected.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Payment TX</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPayoutCommissions.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs">{shortID(row.id)}</TableCell>
                            <TableCell className="capitalize">{row.commission_type}</TableCell>
                            <TableCell className="font-mono text-xs">{shortID(row.payment_transaction_id)}</TableCell>
                            <TableCell>{formatIDR(row.commission_amount_idr)}</TableCell>
                            <TableCell className="text-right">
                              <Button type="button" variant="ghost" size="sm" onClick={() => setPayoutCommissionIDs((prev) => prev.filter((id) => id !== row.id))}>Remove</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payout-reference">Payment reference</Label>
                <Input id="payout-reference" placeholder="Bank transfer reference" value={payoutReference} onChange={(event) => setPayoutReference(event.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayoutDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={mutations.createPayout.isPending || !payoutAccountID || payoutCommissionIDs.length === 0}>Record payout</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={voidTarget !== null} onOpenChange={(value) => !value && setVoidTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void commission?</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="void-reason">Reason</Label>
              <Textarea id="void-reason" value={voidReason} onChange={(event) => setVoidReason(event.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidTarget(null)}>Cancel</Button>
              <Button variant="destructive" disabled={!voidReason.trim() || mutations.voidCommission.isPending} onClick={() => {
                if (!voidTarget) return;
                mutations.voidCommission.mutate({ id: voidTarget, reason: voidReason.trim() }, { onSuccess: () => setVoidTarget(null) });
              }}>Void</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <DeleteDialog
          open={deleteAccountTarget !== null}
          title="Delete referral account?"
          description={deleteAccountTarget ? `Delete ${deleteAccountTarget.name || deleteAccountTarget.email}? This keeps history but hides account from active lists.` : ""}
          confirmLabel="Delete account"
          loading={mutations.deleteAccount.isPending}
          onClose={() => setDeleteAccountTarget(null)}
          onConfirm={() => {
            if (!deleteAccountTarget) return;
            mutations.deleteAccount.mutate(deleteAccountTarget.id, { onSuccess: () => setDeleteAccountTarget(null) });
          }}
        />
        <DeleteDialog
          open={deleteCodeTarget !== null}
          title="Delete referral code?"
          description={deleteCodeTarget ? `Delete ${deleteCodeTarget.code}? This keeps conversion history but hides code from active lists.` : ""}
          confirmLabel="Delete code"
          loading={mutations.deleteCode.isPending}
          onClose={() => setDeleteCodeTarget(null)}
          onConfirm={() => {
            if (!deleteCodeTarget) return;
            mutations.deleteCode.mutate(deleteCodeTarget.id, { onSuccess: () => setDeleteCodeTarget(null) });
          }}
        />
      </div>
    </PageMotion>
  );
}
