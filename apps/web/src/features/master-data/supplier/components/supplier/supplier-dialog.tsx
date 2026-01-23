"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  useCreateSupplier,
  useUpdateSupplier,
  useSupplier,
} from "../../hooks/use-suppliers";
import { useSupplierTypes } from "../../hooks/use-supplier-types";
import type { Supplier, CreatePhoneNumberData, CreateSupplierBankData } from "../../types";
import { sortOptions } from "@/lib/utils";
import { SupplierPhoneList } from "./supplier-phone-list";
import { SupplierBankList } from "./supplier-bank-list";

const formSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  supplier_type_id: z.string().optional(),
  address: z.string().max(500, "Address cannot exceed 500 characters").optional(),
  village_id: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  npwp: z.string().max(30, "NPWP cannot exceed 30 characters").optional(),
  contact_person: z.string().max(100, "Contact person cannot exceed 100 characters").optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  is_active: z.boolean(),
  // Arrays for creation mode
  phone_numbers: z.array(z.any()).optional(), 
  bank_accounts: z.array(z.any()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Supplier | null;
}

export function SupplierDialog({
  open,
  onOpenChange,
  editingItem,
}: SupplierDialogProps) {
  const t = useTranslations("supplier.supplier");
  const tCommon = useTranslations("supplier.common");
  
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  
  // Fetch supplier types for dropdown
  const { data: supplierTypesData } = useSupplierTypes({
    page: 1,
    per_page: 100,
  });
  const supplierTypes = sortOptions(supplierTypesData?.data ?? [], (t) => t.name);

  // Fetch fresh detail if editing to ensure we have latest nested data
  const { data: detailData, isLoading: isLoadingDetail } = useSupplier(editingItem?.id ?? "");
  const activeItem = detailData?.data ?? editingItem;

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      supplier_type_id: "",
      address: "",
      village_id: "",
      email: "",
      website: "",
      npwp: "",
      contact_person: "",
      notes: "",
      is_active: true,
      phone_numbers: [],
      bank_accounts: [],
    },
  });

  useEffect(() => {
    if (open) {
      if (activeItem) {
        reset({
          code: activeItem.code,
          name: activeItem.name,
          supplier_type_id: activeItem.supplier_type_id ?? "",
          address: activeItem.address ?? "",
          village_id: activeItem.village_id ?? "",
          email: activeItem.email ?? "",
          website: activeItem.website ?? "",
          npwp: activeItem.npwp ?? "",
          contact_person: activeItem.contact_person ?? "",
          notes: activeItem.notes ?? "",
          is_active: activeItem.is_active,
          phone_numbers: [], 
          bank_accounts: [],
        });
      } else {
        reset({
          code: "",
          name: "",
          supplier_type_id: "",
          address: "",
          village_id: "",
          email: "",
          website: "",
          npwp: "",
          contact_person: "",
          notes: "",
          is_active: true,
          phone_numbers: [],
          bank_accounts: [],
        });
      }
    }
  }, [open, activeItem, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        supplier_type_id: data.supplier_type_id || undefined,
        address: data.address || undefined,
        village_id: data.village_id || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        npwp: data.npwp || undefined,
        contact_person: data.contact_person || undefined,
        notes: data.notes || undefined,
        is_active: data.is_active,
        phone_numbers: !isEditing ? data.phone_numbers : undefined,
        bank_accounts: !isEditing ? data.bank_accounts : undefined,
      };

      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        toast.success(t("updateSuccess"));
      } else {
        await createMutation.mutateAsync(payload as any);
        toast.success(t("createSuccess"));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? t("error_update") : "Failed to create supplier");
    }
  };

  const supplierTypeId = watch("supplier_type_id");
  const isActive = watch("is_active");
  const formPhones = watch("phone_numbers") as CreatePhoneNumberData[] ?? [];
  const formBanks = watch("bank_accounts") as CreateSupplierBankData[] ?? [];

  // Handlers for Create Mode lists
  const handleAddPhone = (phone: CreatePhoneNumberData) => {
    setValue("phone_numbers", [...formPhones, phone]);
  };
  const handleUpdatePhone = (index: number, phone: CreatePhoneNumberData) => {
    const newPhones = [...formPhones];
    newPhones[index] = phone;
    setValue("phone_numbers", newPhones);
  };
  const handleDeletePhone = (index: number) => {
    setValue("phone_numbers", formPhones.filter((_, i) => i !== index));
  };

  const handleAddBank = (bank: CreateSupplierBankData) => {
    setValue("bank_accounts", [...formBanks, bank]);
  };
  const handleUpdateBank = (index: number, bank: CreateSupplierBankData) => {
    const newBanks = [...formBanks];
    newBanks[index] = bank;
    setValue("bank_accounts", newBanks);
  };
  const handleDeleteBank = (index: number) => {
    setValue("bank_accounts", formBanks.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        
        {isEditing && isLoadingDetail ? (
           <div className="flex justify-center p-8">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general" className="cursor-pointer">{t("sections.basicInfo")}</TabsTrigger>
                <TabsTrigger value="phones" className="cursor-pointer">{t("sections.phoneNumbers")}</TabsTrigger>
                <TabsTrigger value="banks" className="cursor-pointer">{t("sections.bankAccounts")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>{t("form.code")} *</FieldLabel>
                      <Input placeholder={t("form.codePlaceholder")} {...register("code")} />
                      {errors.code && <FieldError>{errors.code.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.name")} *</FieldLabel>
                      <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
                      {errors.name && <FieldError>{errors.name.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.supplierType")}</FieldLabel>
                      <Select
                        value={supplierTypeId}
                        onValueChange={(val) => setValue("supplier_type_id", val, { shouldValidate: true })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.supplierTypePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {supplierTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.supplier_type_id && <FieldError>{errors.supplier_type_id.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.contactPerson")}</FieldLabel>
                      <Input placeholder={t("form.contactPersonPlaceholder")} {...register("contact_person")} />
                      {errors.contact_person && <FieldError>{errors.contact_person.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.email")}</FieldLabel>
                      <Input placeholder={t("form.emailPlaceholder")} type="email" {...register("email")} />
                      {errors.email && <FieldError>{errors.email.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.website")}</FieldLabel>
                      <Input placeholder={t("form.websitePlaceholder")} {...register("website")} />
                      {errors.website && <FieldError>{errors.website.message}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel>{t("form.npwp")}</FieldLabel>
                      <Input placeholder={t("form.npwpPlaceholder")} {...register("npwp")} />
                      {errors.npwp && <FieldError>{errors.npwp.message}</FieldError>}
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>{t("form.address")}</FieldLabel>
                    <Textarea
                      placeholder={t("form.addressPlaceholder")}
                      className="resize-none"
                      {...register("address")}
                    />
                    {errors.address && <FieldError>{errors.address.message}</FieldError>}
                  </Field>

                  <Field>
                    <FieldLabel>{t("form.notes")}</FieldLabel>
                    <Textarea
                      placeholder={t("form.notesPlaceholder")}
                      className="resize-none"
                      {...register("notes")}
                    />
                    {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
                  </Field>

                  <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FieldLabel>{t("form.isActive")}</FieldLabel>
                      <p className="text-sm text-muted-foreground">
                        {tCommon("active")} / {tCommon("inactive")} status
                      </p>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(val) => setValue("is_active", val)}
                      className="cursor-pointer"
                    />
                  </Field>
              </TabsContent>
              
              <TabsContent value="phones" className="mt-4 space-y-4">
                <SupplierPhoneList
                  supplierId={isEditing ? editingItem?.id : undefined}
                  phones={isEditing ? (activeItem?.phone_numbers ?? []) : formPhones}
                  onAdd={handleAddPhone}
                  onUpdate={handleUpdatePhone}
                  onDelete={handleDeletePhone}
                />
                {!isEditing && (
                   <p className="text-xs text-muted-foreground italic">
                     Note: Phone numbers added here will be saved when you click "{tCommon("create")}".
                   </p>
                )}
              </TabsContent>

              <TabsContent value="banks" className="mt-4 space-y-4">
                <SupplierBankList
                  supplierId={isEditing ? editingItem?.id : undefined}
                  banks={isEditing ? (activeItem?.bank_accounts ?? []) : formBanks}
                  onAdd={handleAddBank}
                  onUpdate={handleUpdateBank}
                  onDelete={handleDeleteBank}
                />
                {!isEditing && (
                   <p className="text-xs text-muted-foreground italic">
                     Note: Bank accounts added here will be saved when you click "{tCommon("create")}".
                   </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? tCommon("save") : tCommon("create")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
