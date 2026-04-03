import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeSettingsService } from "../services/finance-settings-service";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export const useFinanceSettings = () => {
  return useQuery({
    queryKey: ["financeSettings"],
    queryFn: financeSettingsService.getAll,
  });
};

export const useBatchUpsertFinanceSettings = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("common");

  return useMutation({
    mutationFn: financeSettingsService.batchUpsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings"] });
      toast.success(t("success"));
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || t("error");
      toast.error(message);
    },
  });
};
