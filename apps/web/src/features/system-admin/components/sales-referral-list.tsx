"use client";

import { useMemo, useState } from "react";
import { PageMotion } from "@/components/motion/page-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useSalesReferralAccounts,
  useActiveCoupons,
  useSalesReferralCodes,
  useSalesReferralMutations,
  useSalesReferralStats,
} from "../hooks/use-sales-referrals";
import type {
  CreateSalesReferralAccountRequest,
  CreateSalesReferralCodeRequest,
  SalesReferralAccount,
  SalesReferralCode,
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
  expiresAt: string;
};

type ReferralFilter = "all" | "active" | "inactive";

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

function codeForm(code?: SalesReferralCode | null): CodeFormState {
  return {
    salesReferralAccountID: code?.sales_referral_account_id ?? "",
    couponID: code?.coupon_id ?? "",
    code: code?.code ?? "",
    campaignName: code?.campaign_name ?? "",
    description: code?.description ?? "",
    isActive: code?.is_active ?? true,
    maxUses: code?.max_uses ?? 100,
    maxUsesPerEmail: code?.max_uses_per_email ?? 1,
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
  const isEdit = Boolean(account);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      email: form.email.trim().toLowerCase(),
      name: form.name.trim() || null,
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
            <Label htmlFor="ref-account-email">Email</Label>
            <Input
              id="ref-account-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref-account-name">Name</Label>
            <Input
              id="ref-account-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="ref-account-active">Active</Label>
            <Switch
              id="ref-account-active"
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
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
}

function CodeDialog({ open, code, accounts, coupons, onClose, onSubmit, isSaving }: CodeDialogProps) {
  const [form, setForm] = useState<CodeFormState>(() => codeForm(code));
  const isEdit = Boolean(code);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
              <Label htmlFor="ref-code-account">Sales account</Label>
              <Select
                value={form.salesReferralAccountID}
                onValueChange={(value) => setForm((prev) => ({ ...prev, salesReferralAccountID: value }))}
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-coupon">Wrapped coupon</Label>
              <Select
                value={form.couponID}
                onValueChange={(value) => setForm((prev) => ({ ...prev, couponID: value }))}
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
              <p className="text-xs text-muted-foreground">Referral code inherits discount/trial rules from selected coupon.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-code">Public code</Label>
              <Input
                id="ref-code-code"
                required
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              />
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
              <Label htmlFor="ref-code-max">Max uses</Label>
              <Input
                id="ref-code-max"
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(event) => setForm((prev) => ({ ...prev, maxUses: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-max-email">Max uses / email</Label>
              <Input
                id="ref-code-max-email"
                type="number"
                min={1}
                value={form.maxUsesPerEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, maxUsesPerEmail: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-code-expiry">Expires at</Label>
              <Input
                id="ref-code-expiry"
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="ref-code-active">Active</Label>
            <Switch
              id="ref-code-active"
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="cursor-pointer" disabled={isSaving}>{isSaving ? "Saving..." : "Save code"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SalesReferralList() {
  const [accountPage, setAccountPage] = useState(1);
  const [codePage, setCodePage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [activeTab, setActiveTab] = useState<"codes" | "accounts">("codes");
  const [codeFilter, setCodeFilter] = useState<ReferralFilter>("all");
  const [accountFilter, setAccountFilter] = useState<ReferralFilter>("all");
  const [accountDialog, setAccountDialog] = useState<SalesReferralAccount | null | "create">(null);
  const [codeDialog, setCodeDialog] = useState<SalesReferralCode | null | "create">(null);
  const params = useMemo(() => ({ page: 1, per_page: 20, search: debouncedSearch.trim() || undefined }), [debouncedSearch]);
  const stats = useSalesReferralStats();
  const accounts = useSalesReferralAccounts({ ...params, page: accountPage });
  const codes = useSalesReferralCodes({ ...params, page: codePage });
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

        <Tabs defaultValue="codes" onValueChange={(value) => setActiveTab(value as "codes" | "accounts")}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="codes">Codes</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
            </TabsList>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
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
              {activeTab === "codes" ? (
                <Button className="cursor-pointer gap-2" onClick={() => setCodeDialog("create")}>
                  <Plus className="h-4 w-4" /> Code
                </Button>
              ) : (
                <Button className="cursor-pointer gap-2" onClick={() => setAccountDialog("create")}>
                  <Plus className="h-4 w-4" /> Account
                </Button>
              )}
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
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.isLoading ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                  )) : filteredCodes.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No referral codes found.</TableCell></TableRow>
                  ) : filteredCodes.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell><div className="flex items-center gap-2 font-mono font-medium">{row.code}<CopyButton text={row.code} /></div></TableCell>
                      <TableCell>{row.sales_referral_account?.name || row.sales_referral_account?.email || row.sales_referral_account_id}</TableCell>
                      <TableCell>{row.campaign_name || "-"}</TableCell>
                      <TableCell>{row.used_count}/{row.max_uses}</TableCell>
                      <TableCell>{formatDate(row.expires_at)}</TableCell>
                      <TableCell><StatusBadge active={row.is_active} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setCodeDialog(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="cursor-pointer text-destructive" onClick={() => mutations.deleteCode.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>
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
                        <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setAccountDialog(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="cursor-pointer text-destructive" onClick={() => mutations.deleteAccount.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
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
      </div>
    </PageMotion>
  );
}
