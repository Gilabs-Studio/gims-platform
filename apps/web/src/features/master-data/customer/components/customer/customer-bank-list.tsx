"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm, SubmitHandler, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useCurrencies } from "@/features/master-data/currencies/hooks/use-currencies";
import {
  useAddCustomerBank,
  useUpdateCustomerBank,
  useDeleteCustomerBank,
} from "../../hooks/use-customers";
import { useBanks } from "@/features/master-data/supplier/hooks/use-banks";
import type { CustomerBank, CreateCustomerBankData } from "../../types";

const bankSchema = z.object({
  bank_id: z.string().min(1, "Bank is required"),
  currency_id: z.string().min(1, "Currency is required"),
  account_number: z.string().min(3, "Account number is required"),
  account_name: z.string().min(3, "Account name is required"),
  branch: z.string().optional(),
  is_primary: z.boolean().default(false),
});

type BankFormData = z.infer<typeof bankSchema>;

type CustomerBankListItem = CustomerBank | CreateCustomerBankData;

interface CustomerBankListProps {
  customerId?: string;
  banks: CustomerBankListItem[];
  onAdd?: (bank: CreateCustomerBankData) => void;
  onUpdate?: (index: number, bank: CreateCustomerBankData) => void;
  onDelete?: (index: number) => void;
  isReadOnly?: boolean;
}

function isPersistedCustomerBank(bank: CustomerBankListItem): bank is CustomerBank {
  return "id" in bank;
}

export function CustomerBankList({
  customerId,
  banks,
  onAdd,
  onUpdate,
  onDelete,
  isReadOnly = false,
}: CustomerBankListProps) {
  const t = useTranslations("customer.bankAccount");
  const tCommon = useTranslations("customer.common");
  const tValidation = useTranslations("customer.validation");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<CustomerBankListItem | null>(null);

  const addMutation = useAddCustomerBank();
  const updateMutation = useUpdateCustomerBank();
  const deleteMutation = useDeleteCustomerBank();

  const { data: bankOptionsData } = useBanks({ page: 1, per_page: 20 });
  const { data: currencyOptionsData } = useCurrencies({ page: 1, per_page: 20, sort_by: "code", sort_dir: "asc" });
  const bankOptions = bankOptionsData?.data ?? [];
  const currencyOptions = currencyOptionsData?.data ?? [];

  const isSubmitting = addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema) as any,
    defaultValues: {
      bank_id: "",
      currency_id: "",
      account_number: "",
      account_name: "",
      branch: "",
      is_primary: false,
    },
  });

  const handleOpenCreate = () => {
    setEditingIndex(null);
    setEditingItem(null);
    reset({
      bank_id: "",
      currency_id: "",
      account_number: "",
      account_name: "",
      branch: "",
      is_primary: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (index: number, item: CustomerBankListItem) => {
    setEditingIndex(index);
    setEditingItem(item);
    reset({
      bank_id: item.bank_id,
      currency_id: item.currency_id ?? "",
      account_number: item.account_number,
      account_name: item.account_name,
      branch: item.branch,
      is_primary: item.is_primary,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (index: number, item: CustomerBankListItem) => {
    if (!confirm(tCommon("deleteConfirm") || "Are you sure?")) return;

    if (customerId && isPersistedCustomerBank(item)) {
      try {
        await deleteMutation.mutateAsync({ customerId, bankId: item.id });
        toast.success(t("deleteSuccess"));
      } catch {
        toast.error("Failed to delete bank account");
      }
    } else if (onDelete) {
      onDelete(index);
      toast.success(t("deleteSuccess"));
    }
  };

  const onSubmit: SubmitHandler<BankFormData> = async (data) => {
    try {
      if (customerId) {
        if (editingItem && isPersistedCustomerBank(editingItem)) {
          await updateMutation.mutateAsync({
            customerId,
            bankId: editingItem.id,
            data,
          });
          toast.success(t("updateSuccess"));
        } else {
          await addMutation.mutateAsync({
            customerId,
            data,
          });
          toast.success("createSuccess" in t ? t("createSuccess") : "Bank account added");
        }
      } else {
        if (editingIndex !== null && onUpdate) {
          onUpdate(editingIndex, data);
          toast.success(t("updateSuccess"));
        } else if (onAdd) {
          onAdd(data);
          toast.success("createSuccess" in t ? t("createSuccess") : "Bank account added");
        }
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save bank account");
    }
  };

  const getBankName = (id: string) => {
    return bankOptions.find((b) => b.id === id)?.name || "Unknown Bank";
  };

  const getCurrencyCode = (id?: string | null) => {
    if (!id) return "-";
    return currencyOptions.find((currency) => currency.id === id)?.code || "-";
  };

  const bankId = useWatch({ control, name: "bank_id" });
  const currencyId = useWatch({ control, name: "currency_id" });
  const isPrimary = useWatch({ control, name: "is_primary" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        {!isReadOnly && (
          <Button size="sm" onClick={handleOpenCreate} className="cursor-pointer" type="button">
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("form.bank")}</TableHead>
              <TableHead>{t("form.accountNumber")}</TableHead>
              <TableHead>{t("form.accountName")}</TableHead>
              <TableHead>{t("form.currency")}</TableHead>
              <TableHead>{t("form.isPrimary")}</TableHead>
              {!isReadOnly && <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isReadOnly ? 5 : 6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              banks.map((bank, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-3 w-3 text-muted-foreground" />
                      {(isPersistedCustomerBank(bank) ? bank.bank?.name : undefined) || getBankName(bank.bank_id)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{bank.account_number}</TableCell>
                  <TableCell>{bank.account_name}</TableCell>
                  <TableCell>{(isPersistedCustomerBank(bank) ? bank.currency?.code : undefined) ?? getCurrencyCode(bank.currency_id)}</TableCell>
                  <TableCell>
                    {bank.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(index, bank)}
                          className="h-8 w-8 cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(index, bank)}
                          className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t("editTitle") : t("addTitle")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <Field>
              <FieldLabel>{t("form.bank")}</FieldLabel>
              <Select
                value={bankId}
                onValueChange={(val) => setValue("bank_id", val, { shouldValidate: true })}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("form.bankPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="cursor-pointer">
                      {b.name} - {b.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bank_id && <FieldError>{tValidation("bankRequired")}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>{t("form.currency")}</FieldLabel>
              <Select
                value={currencyId}
                onValueChange={(val) => setValue("currency_id", val, { shouldValidate: true })}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("form.currencyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id} className="cursor-pointer">
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency_id && <FieldError>{tValidation("currencyRequired")}</FieldError>}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>{t("form.accountNumber")}</FieldLabel>
                <Input placeholder={t("form.accountNumberPlaceholder")} {...register("account_number")} />
                {errors.account_number && <FieldError>{tValidation("accountNumberRequired")}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>{t("form.accountName")}</FieldLabel>
                <Input placeholder={t("form.accountNamePlaceholder")} {...register("account_name")} />
                {errors.account_name && <FieldError>{tValidation("accountNameRequired")}</FieldError>}
              </Field>
            </div>

            <Field>
              <FieldLabel>{t("form.branch")}</FieldLabel>
              <Input placeholder={t("form.branchPlaceholder")} {...register("branch")} />
              {errors.branch && <FieldError>{errors.branch.message}</FieldError>}
            </Field>

            <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FieldLabel>{t("form.isPrimary")}</FieldLabel>
                <p className="text-xs text-muted-foreground">Set as main bank account</p>
              </div>
              <Switch
                checked={isPrimary}
                onCheckedChange={(val) => setValue("is_primary", val)}
                className="cursor-pointer"
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {editingItem ? tCommon("save") : tCommon("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
