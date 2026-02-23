import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateSupplier, useUpdateSupplier, useSupplier } from "./use-suppliers";
import { useSupplierTypes } from "./use-supplier-types";
import type { Supplier } from "../types";
import { sortOptions } from "@/lib/utils";

export const supplierFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  supplier_type_id: z.string().optional(),
  address: z.string().max(500, "Address cannot exceed 500 characters").optional(),
  province_id: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
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

export type SupplierFormData = z.infer<typeof supplierFormSchema>;

export interface UseSupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Supplier | null;
}

export function useSupplierForm({ open, onOpenChange, editingItem }: UseSupplierFormProps) {
  const t = useTranslations("supplier.supplier");
  const tCommon = useTranslations("supplier.common");
  
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  
  // Fetch supplier types conditionally
  const { data: supplierTypesData } = useSupplierTypes({
    page: 1,
    per_page: 100,
  }, { enabled: open });
  const supplierTypes = sortOptions(supplierTypesData?.data ?? [], (t) => t.name);

  // Fetch fresh detail if editing to ensure we have latest nested data
  const { data: detailData, isLoading: isLoadingDetail } = useSupplier(editingItem?.id ?? "");
  const activeItem = detailData?.data ?? editingItem;

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      supplier_type_id: "",
      address: "",
      province_id: "",
      city_id: "",
      district_id: "",
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
        form.reset({
          name: activeItem.name,
          supplier_type_id: activeItem.supplier_type_id ?? "",
          address: activeItem.address ?? "",
          province_id: activeItem.province_id ?? "",
          city_id: activeItem.city_id ?? "",
          district_id: activeItem.district_id ?? "",
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
        form.reset({
          name: "",
          supplier_type_id: "",
          address: "",
          province_id: "",
          city_id: "",
          district_id: "",
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
  }, [open, activeItem, form]);

  const onSubmit: SubmitHandler<SupplierFormData> = async (data) => {
    try {
      const payload = {
        name: data.name,
        supplier_type_id: data.supplier_type_id || undefined,
        address: data.address || undefined,
        province_id: data.province_id || undefined,
        city_id: data.city_id || undefined,
        district_id: data.district_id || undefined,
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
        toast.success(t("updateSuccess", { fallback: "Supplier updated successfully" }));
      } else {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        await createMutation.mutateAsync(payload as any);
        toast.success(t("createSuccess", { fallback: "Supplier created successfully" }));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? t("error_update", { fallback: "Error updating" }) : "Failed to create supplier");
    }
  };

  return {
    form,
    t,
    tCommon,
    isEditing,
    isSubmitting,
    isLoadingDetail,
    activeItem,
    supplierTypes,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
