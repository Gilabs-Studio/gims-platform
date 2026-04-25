"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Search, UserPlus, Users, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { useCustomers } from "@/features/master-data/customer/hooks/use-customers";
import { useLoyaltyPrograms, useEnrollLoyaltyMember, useMyOutlets } from "../hooks/use-loyalty";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { LoyaltyProgram } from "../types";
import type { Customer } from "@/features/master-data/customer/types";

// ── Zod schema for new-customer tab ───────────────────────────────────────────

const newCustomerSchema = z.object({
  name: z.string().min(2, "Name is required (min 2 characters)"),
  phone: z.string().min(5, "Phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type NewCustomerForm = z.infer<typeof newCustomerSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface LoyaltyEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Sub-component: program selector ──────────────────────────────────────────

function ProgramSelector({
  programs,
  value,
  onChange,
  placeholder,
}: {
  programs: LoyaltyProgram[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {programs.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export function LoyaltyEnrollDialog({ open, onOpenChange }: LoyaltyEnrollDialogProps) {
  const t = useTranslations("loyalty");
  const tCommon = useTranslations("common");
  const { user } = useAuthStore();
  const isOutletScoped = user?.role.data_scope === "OUTLET";
  const { data: myOutletsData } = useMyOutlets({ enabled: isOutletScoped });
  // For outlet-scoped users, default the enrollment outlet to their first outlet.
  const myFirstOutletId = myOutletsData?.data?.[0]?.id;

  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");

  // ── Program selection (shared across tabs) ────────────────────────────────
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const { data: programsData, isLoading: programsLoading } = useLoyaltyPrograms({ per_page: 100 });
  const programs = programsData?.data ?? [];
  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId),
    [programs, selectedProgramId],
  );

  // ── Enroll mutation ───────────────────────────────────────────────────────
  const enrollMutation = useEnrollLoyaltyMember();

  // ── Existing-customer tab state ───────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customersData, isLoading: customersLoading } = useCustomers(
    { per_page: 50, search: customerSearch || undefined, is_loyalty_member: false },
    { enabled: activeTab === "existing" },
  );
  const customers = customersData?.data ?? [];

  async function handleEnrollExisting() {
    if (!selectedCustomer || !selectedProgramId) return;
    // Prefer the program's outlet; fall back to the manager's outlet for global programs.
    const outletId = selectedProgram?.outlet_id ?? myFirstOutletId;
    try {
      await enrollMutation.mutateAsync({
        customer_id: selectedCustomer.id,
        program_id: selectedProgramId,
        outlet_id: outletId,
        name: selectedCustomer.name,
      });
      toast.success(t("members.enrolled"));
      handleClose();
    } catch {
      toast.error(t("members.enrollError"));
    }
  }

  // ── New-customer tab form ─────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset: resetNewForm,
    formState: { errors },
  } = useForm<NewCustomerForm>({ resolver: zodResolver(newCustomerSchema) });

  async function handleEnrollNew(values: NewCustomerForm) {
    if (!selectedProgramId) {
      toast.error(t("members.enrollSelectProgram"));
      return;
    }
    try {
      await enrollMutation.mutateAsync({
        program_id: selectedProgramId,
        outlet_id: selectedProgram?.outlet_id ?? myFirstOutletId,
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
      });
      toast.success(t("members.enrolled"));
      handleClose();
    } catch {
      toast.error(t("members.enrollError"));
    }
  }

  // ── Reset on close ────────────────────────────────────────────────────────
  function handleClose() {
    onOpenChange(false);
    setActiveTab("existing");
    setSelectedProgramId("");
    setSelectedCustomer(null);
    setCustomerSearch("");
    resetNewForm();
  }

  const canEnrollExisting = !!selectedCustomer && !!selectedProgramId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg" className="gap-5">
        <DialogHeader>
          <DialogTitle>{t("members.enroll")}</DialogTitle>
        </DialogHeader>

        {/* Program selection — shared */}
        <Field>
          <FieldLabel>{t("members.enrollDialog.program")}</FieldLabel>
          {programsLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <ProgramSelector
              programs={programs}
              value={selectedProgramId}
              onChange={setSelectedProgramId}
              placeholder={t("members.enrollDialog.selectProgram")}
            />
          )}
        </Field>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v === "new" ? "new" : "existing")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1 gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t("members.enrollDialog.tabExisting")}
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1 gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              {t("members.enrollDialog.tabNew")}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: existing customer ────────────────────────────────── */}
          <TabsContent value="existing" className="mt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tCommon("search")}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Customer table */}
            <div className="rounded-md border">
              <ScrollArea className="h-[220px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("pos.enrollName")}</TableHead>
                      <TableHead>{t("pos.enrollEmail")}</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customersLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-7 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : customers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center text-sm text-muted-foreground">
                          {tCommon("empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          data-selected={selectedCustomer?.id === customer.id}
                          className="data-[selected=true]:bg-primary/5"
                        >
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {customer.email ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={selectedCustomer?.id === customer.id ? "default" : "outline"}
                              className="cursor-pointer h-7 text-xs"
                              onClick={() =>
                                setSelectedCustomer(
                                  selectedCustomer?.id === customer.id ? null : customer,
                                )
                              }
                            >
                              {selectedCustomer?.id === customer.id
                                ? t("members.enrollDialog.selected")
                                : t("members.enrollDialog.select")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {selectedCustomer && (
              <p className="text-xs text-muted-foreground">
                {t("members.enrollDialog.selectedCustomer")}: <span className="font-medium text-foreground">{selectedCustomer.name}</span>
              </p>
            )}

            <Button
              className="w-full cursor-pointer"
              disabled={!canEnrollExisting || enrollMutation.isPending}
              onClick={handleEnrollExisting}
            >
              {enrollMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("members.enroll")}
            </Button>
          </TabsContent>

          {/* ── Tab: new customer ─────────────────────────────────────── */}
          <TabsContent value="new" className="mt-4">
            <form onSubmit={handleSubmit(handleEnrollNew)} className="space-y-4">
              <Field>
                <FieldLabel>{t("pos.enrollName")}</FieldLabel>
                <Input
                  placeholder={t("pos.enrollNamePlaceholder")}
                  {...register("name")}
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>{t("pos.enrollPhone")}</FieldLabel>
                <Input type="tel" placeholder="081234567890" {...register("phone")} />
                {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>{t("pos.enrollEmail")}</FieldLabel>
                <Input type="email" placeholder="email@example.com" {...register("email")} />
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
              </Field>

              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={!selectedProgramId || enrollMutation.isPending}
              >
                {enrollMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("members.enroll")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
