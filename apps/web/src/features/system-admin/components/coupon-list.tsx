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
import { Plus, Copy, Check } from "lucide-react";
import type { Coupon, CouponType, CreateCouponRequest } from "../types";

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  full_access: "Full Access",
  pos_only: "POS Only",
  erp_only: "ERP Only",
  crm_only: "CRM Only",
  hr_only: "HR Only",
};

function CopyButton({ text }: { text: string }) {
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
      aria-label="Copy coupon code"
      className="ml-1.5 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

interface CreateCouponDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateCouponDialog({ open, onClose, onCreated }: CreateCouponDialogProps) {
  const [form, setForm] = useState<CreateCouponRequest>({
    description: "",
    coupon_type: "full_access",
    duration_days: 30,
    max_uses: 100,
    expires_at: null,
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreateCouponRequest) => systemAdminService.createCoupon(payload),
    onSuccess: () => {
      onCreated();
      onClose();
      setForm({ description: "", coupon_type: "full_access", duration_days: 30, max_uses: 100, expires_at: null });
      setError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message ?? "Failed to create coupon");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.description.trim()) {
      setError("Description is required");
      return;
    }
    if (form.duration_days < 1) {
      setError("Duration must be at least 1 day");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate New Coupon</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea
              id="c-desc"
              placeholder="e.g. Trial coupon — 30-day full access for launch"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-type">Coupon Type</Label>
            <Select
              value={form.coupon_type}
              onValueChange={(v) => setForm((p) => ({ ...p, coupon_type: v as CouponType }))}
            >
              <SelectTrigger id="c-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COUPON_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-days">Duration (days)</Label>
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
              <Label htmlFor="c-uses">Max Uses</Label>
              <Input
                id="c-uses"
                type="number"
                min={1}
                max={99999}
                value={form.max_uses ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, max_uses: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-expires">Expires At (optional)</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Generating..." : "Generate Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CouponList() {
  const [activeOnly, setActiveOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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
          Failed to load coupons.
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Coupon Management</h1>
            <p className="text-sm text-muted-foreground">
              Generate and manage access coupons for tenant registration.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Coupon
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Label htmlFor="active-filter" className="text-sm font-normal">
            Active only
          </Label>
          <Switch
            id="active-filter"
            checked={activeOnly}
            onCheckedChange={setActiveOnly}
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No coupons found. Generate one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon: Coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono text-sm font-semibold tracking-widest">
                      {coupon.code}
                      <CopyButton text={coupon.code} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                      {coupon.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {COUPON_TYPE_LABELS[coupon.coupon_type] ?? coupon.coupon_type}
                      </Badge>
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
                      <StatusBadge isActive={coupon.is_active} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={coupon.is_active}
                        disabled={toggleStatus.isPending}
                        onCheckedChange={(checked) =>
                          toggleStatus.mutate({ id: coupon.id, isActive: checked })
                        }
                        aria-label={`Toggle ${coupon.code}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateCouponDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["sys-coupons"] })}
      />
    </PageMotion>
  );
}
