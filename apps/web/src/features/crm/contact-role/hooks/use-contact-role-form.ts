import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateContactRole, useUpdateContactRole } from "./use-contact-role";
import type { ContactRole } from "../types";

const schema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  badge_color: z.string().max(20).optional(),
});

type FormData = z.infer<typeof schema>;

export interface UseContactRoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: ContactRole | null;
}

export function useContactRoleForm({ open, onOpenChange, editingItem }: UseContactRoleFormProps) {
  const t = useTranslations("contactRole");
  const tCommon = useTranslations("common");

  const createMutation = useCreateContactRole();
  const updateMutation = useUpdateContactRole();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", badge_color: "#3B82F6" },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({ name: editingItem.name, description: editingItem.description ?? "", badge_color: editingItem.badge_color ?? "#3B82F6" });
      } else {
        form.reset({ name: "", description: "", badge_color: "#3B82F6" });
      }
    }
  }, [editingItem, form, open]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t("created"));
      }
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return { form, t, tCommon, isLoading, onSubmit: form.handleSubmit(onSubmit) };
}
