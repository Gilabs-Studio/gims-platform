import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateLeadSource, useUpdateLeadSource } from "./use-lead-source";
import type { LeadSource } from "../types";

const schema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export interface UseLeadSourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: LeadSource | null;
  onCreated?: (item: { id: string; name: string }) => void;
  initialData?: { name?: string };
}

export function useLeadSourceForm({
  open,
  onOpenChange,
  editingItem,
  onCreated,
  initialData,
}: UseLeadSourceFormProps) {
  const t = useTranslations("leadSource");
  const tCommon = useTranslations("common");

  const createMutation = useCreateLeadSource();
  const updateMutation = useUpdateLeadSource();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({ name: editingItem.name, description: editingItem.description ?? "" });
      } else {
        form.reset({
          name: initialData?.name ?? "",
          description: "",
        });
      }
    }
  }, [editingItem, form, initialData?.name, open]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data });
        toast.success(t("updated"));
      } else {
        const result = (await createMutation.mutateAsync(data)) as {
          data: { id: string; name: string };
        };
        toast.success(t("created"));
        onCreated?.(result.data);
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
