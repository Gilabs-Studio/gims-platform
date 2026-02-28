import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateCourierAgency, useUpdateCourierAgency } from "./use-courier-agency";
import type { CourierAgency } from "../types";

export const courierAgencySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  tracking_url: z.string().max(255).optional(),
  is_active: z.boolean(),
});

export type CourierAgencyFormData = z.infer<typeof courierAgencySchema>;

export interface UseCourierAgencyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: CourierAgency | null;
  /** Called after a successful create with the newly created item's id and name */
  onCreated?: (item: { id: string; name: string }) => void;
}

export function useCourierAgencyForm({ open, onOpenChange, editingItem, onCreated }: UseCourierAgencyFormProps) {
  const t = useTranslations("courierAgency");
  const tCommon = useTranslations("common");

  const createMutation = useCreateCourierAgency();
  const updateMutation = useUpdateCourierAgency();

  const form = useForm<CourierAgencyFormData>({
    resolver: zodResolver(courierAgencySchema),
    defaultValues: {
      name: "",
      description: "",
      phone: "",
      address: "",
      tracking_url: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          description: editingItem.description ?? "",
          phone: editingItem.phone ?? "",
          address: editingItem.address ?? "",
          tracking_url: editingItem.tracking_url ?? "",
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          phone: "",
          address: "",
          tracking_url: "",
          is_active: true,
        });
      }
    }
  }, [editingItem, form, open]);

  const onSubmit: SubmitHandler<CourierAgencyFormData> = async (data) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data });
        toast.success(t("updated", { fallback: "Courier agency updated successfully" }));
      } else {
        const result = await createMutation.mutateAsync(data);
        toast.success(t("created", { fallback: "Courier agency created successfully" }));
        onCreated?.({ id: result.data.id, name: result.data.name });
      }
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(tCommon("error", { fallback: "An error occurred" }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return {
    form,
    t,
    tCommon,
    isLoading,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
