import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreatePaymentTerms, useUpdatePaymentTerms } from "./use-payment-terms";
import type { PaymentTerms } from "../types";

export const paymentTermsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  days: z.number().min(0),
  is_active: z.boolean(),
});

export type PaymentTermsFormData = z.infer<typeof paymentTermsSchema>;

export interface UsePaymentTermsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: PaymentTerms | null;
  /** Called after a successful create with the newly created item's id and name */
  onCreated?: (item: { id: string; name: string }) => void;
}

export function usePaymentTermsForm({ open, onOpenChange, editingItem, onCreated }: UsePaymentTermsFormProps) {
  const t = useTranslations("paymentTerm");
  const tCommon = useTranslations("common");

  const createMutation = useCreatePaymentTerms();
  const updateMutation = useUpdatePaymentTerms();

  const form = useForm<PaymentTermsFormData>({
    resolver: zodResolver(paymentTermsSchema),
    defaultValues: {
      name: "",
      description: "",
      days: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          description: editingItem.description ?? "",
          days: editingItem.days,
          is_active: editingItem.is_active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          days: 0,
          is_active: true,
        });
      }
    }
  }, [editingItem, form, open]);

  const onSubmit: SubmitHandler<PaymentTermsFormData> = async (data) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data,
        });
        toast.success(t("updated", { fallback: "Payment term updated successfully" }));
      } else {
        const result = await createMutation.mutateAsync(data);
        toast.success(t("created", { fallback: "Payment term created successfully" }));
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
