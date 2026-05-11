import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeSettingsService } from "../services/finance-settings-service";
import {
  BatchUpsertFinanceSettingsRequest,
  CreateFiscalYearInput,
  CreateTaxConfigurationInput,
  ListFiscalYearParams,
  ListTaxConfigurationParams,
  UpdateFiscalYearInput,
  UpdateInventorySettingsInput,
  UpdateTaxConfigurationInput,
  UpsertOpeningBalanceInput,
} from "../types";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export const useFinanceSettings = () => {
  return useQuery({
    queryKey: ["financeSettings"],
    queryFn: () => financeSettingsService.getAll(),
  });
};

export const useBatchUpsertFinanceSettings = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("common");

  const resolveErrorCode = (error: unknown): string | null => {
    if (!(error && typeof error === "object" && "response" in error)) {
      return null;
    }

    const payload = (
      error as {
        response?: {
          data?: {
            code?: string;
            error?: string | { code?: string; message?: string };
          };
        };
      }
    ).response?.data;

    if (typeof payload?.code === "string") {
      return payload.code;
    }

    const nestedError = payload?.error;
    if (nestedError && typeof nestedError === "object" && "code" in nestedError) {
      const code = (nestedError as { code?: string }).code;
      return typeof code === "string" ? code : null;
    }

    return null;
  };

  const resolveErrorMessage = (error: unknown): string => {
    const code = resolveErrorCode(error);
    if (code) {
      const knownCodeMessages: Record<string, string> = {
        ACCOUNT_NOT_POSTABLE: "Selected account must be postable.",
        ACCOUNT_INACTIVE: "Selected account is inactive.",
        PERIOD_CLOSED: "Cannot modify mappings while the accounting period is closed.",
        MAPPING_NOT_CONFIGURED: "Some required account mappings are still missing.",
        CONCURRENT_LOCK_CONFLICT: "Mapping update conflict detected. Please retry.",
        VALIDATION_ERROR: "Please check your mapping inputs.",
      };
      if (knownCodeMessages[code]) {
        return knownCodeMessages[code];
      }
    }

    if (error && typeof error === "object" && "response" in error) {
      const responseError = error as {
        response?: {
          data?: {
            error?: string | { message?: string };
            message?: string;
          };
        };
      };

      const plainError = responseError.response?.data?.error;
      if (typeof plainError === "string" && plainError.trim().length > 0) {
        return plainError;
      }

      if (plainError && typeof plainError === "object" && "message" in plainError) {
        const nestedMessage = (plainError as { message?: string }).message;
        if (nestedMessage) return nestedMessage;
      }

      const message = responseError.response?.data?.message;
      if (message) return message;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return t("error");
  };

  const batchUpsert = async (data: BatchUpsertFinanceSettingsRequest) => {
    await Promise.all(
      data.settings.map(async (mapping) => {
        const key = mapping.setting_key.trim();
        const coaCode = mapping.value.trim();
        const label = mapping.description?.trim() || mapping.setting_key;

        if (!key) {
          return;
        }

        if (coaCode.length === 0) {
          await financeSettingsService.deleteByKey(key);
          return;
        }

        await financeSettingsService.upsertByKey(key, {
          coa_code: coaCode,
          label,
        });
      }),
    );

    return financeSettingsService.getAll();
  };

  return useMutation({
    mutationFn: batchUpsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings"] });
      toast.success(t("saved"));
    },
    onError: (error: unknown) => {
      toast.error(resolveErrorMessage(error));
    },
  });
};

export const useFiscalYears = (params: ListFiscalYearParams) => {
  return useQuery({
    queryKey: ["financeSettings", "fiscalYears", params],
    queryFn: () => financeSettingsService.listFiscalYears(params),
    enabled: Boolean(params.company_id),
  });
};

function resolveFiscalYearMutationErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = error as {
      response?: {
        data?: {
          code?: string;
          error?: string | { code?: string; message?: string };
          message?: string;
        };
      };
    };

    const payload = response.response?.data;
    const errorCode =
      typeof payload?.code === "string"
        ? payload.code
        : payload?.error && typeof payload.error === "object" && "code" in payload.error
          ? (payload.error as { code?: string }).code
          : undefined;

    if (errorCode === "CONCURRENT_LOCK_CONFLICT") {
      return "Opening balance must be posted before fiscal year can be locked";
    }

    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }

    if (payload?.error && typeof payload.error === "object" && "message" in payload.error) {
      const nestedMessage = (payload.error as { message?: string }).message;
      if (nestedMessage) {
        return nestedMessage;
      }
    }

    if (payload?.message) {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to update fiscal year";
}

export const useCreateFiscalYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFiscalYearInput) => financeSettingsService.createFiscalYear(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "fiscalYears"] });
      toast.success("Fiscal year created");
    },
  });
};

export const useUpdateFiscalYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId, payload }: { id: string; companyId: string; payload: UpdateFiscalYearInput }) =>
      financeSettingsService.updateFiscalYear(id, companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "fiscalYears"] });
      toast.success("Fiscal year updated");
    },
  });
};

export const useActivateFiscalYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      financeSettingsService.activateFiscalYear(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "fiscalYears"] });
      toast.success("Fiscal year activated");
    },
    onError: (error: unknown) => {
      toast.error(resolveFiscalYearMutationErrorMessage(error));
    },
  });
};

export const useLockFiscalYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      financeSettingsService.lockFiscalYear(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "fiscalYears"] });
      toast.success("Fiscal year locked");
    },
    onError: (error: unknown) => {
      toast.error(resolveFiscalYearMutationErrorMessage(error));
    },
  });
};

export const useDeleteFiscalYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      financeSettingsService.deleteFiscalYear(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "fiscalYears"] });
      toast.success("Fiscal year deleted");
    },
    onError: (error: unknown) => {
      toast.error(resolveFiscalYearMutationErrorMessage(error));
    },
  });
};

export const useTaxConfigurations = (params: ListTaxConfigurationParams) => {
  return useQuery({
    queryKey: ["financeSettings", "taxConfigurations", params],
    queryFn: () => financeSettingsService.listTaxConfigurations(params),
    enabled: Boolean(params.company_id),
  });
};

export const useCreateTaxConfiguration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaxConfigurationInput) =>
      financeSettingsService.createTaxConfiguration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "taxConfigurations"] });
      toast.success("Tax configuration created");
    },
  });
};

export const useUpdateTaxConfiguration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId, payload }: { id: string; companyId: string; payload: UpdateTaxConfigurationInput }) =>
      financeSettingsService.updateTaxConfiguration(id, companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "taxConfigurations"] });
      toast.success("Tax configuration updated");
    },
  });
};

export const useToggleTaxConfigurationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId, isActive }: { id: string; companyId: string; isActive: boolean }) =>
      financeSettingsService.toggleTaxConfigurationStatus(id, companyId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "taxConfigurations"] });
      toast.success("Tax configuration status updated");
    },
  });
};

export const useInventorySettings = (companyId: string) => {
  return useQuery({
    queryKey: ["financeSettings", "inventorySettings", companyId],
    queryFn: () => financeSettingsService.getInventorySettings(companyId),
    enabled: Boolean(companyId),
  });
};

export const useUpdateInventorySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInventorySettingsInput) =>
      financeSettingsService.updateInventorySettings(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "inventorySettings", payload.company_id] });
      toast.success("Inventory settings updated");
    },
  });
};

export const useOpeningBalance = (companyId: string, fiscalYearId: string) => {
  return useQuery({
    queryKey: ["financeSettings", "openingBalance", companyId, fiscalYearId],
    queryFn: () => financeSettingsService.getOpeningBalance(companyId, fiscalYearId),
    enabled: Boolean(companyId && fiscalYearId),
  });
};

export const useUpsertOpeningBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertOpeningBalanceInput) =>
      financeSettingsService.upsertOpeningBalance(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "openingBalance", payload.company_id, payload.fiscal_year_id] });
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "openingBalanceSummary", payload.company_id, payload.fiscal_year_id] });
    },
  });
};

export const useValidateOpeningBalance = () => {
  return useMutation({
    mutationFn: ({ companyId, fiscalYearId }: { companyId: string; fiscalYearId: string }) =>
      financeSettingsService.validateOpeningBalance(companyId, fiscalYearId),
  });
};

export const useSimulateOpeningBalance = () => {
  return useMutation({
    mutationFn: ({ companyId, fiscalYearId }: { companyId: string; fiscalYearId: string }) =>
      financeSettingsService.simulateOpeningBalance(companyId, fiscalYearId),
  });
};

export const usePostOpeningBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { company_id: string; fiscal_year_id: string }) =>
      financeSettingsService.postOpeningBalance(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "openingBalance", payload.company_id, payload.fiscal_year_id] });
      queryClient.invalidateQueries({ queryKey: ["financeSettings", "openingBalanceSummary", payload.company_id, payload.fiscal_year_id] });
      toast.success("Opening balance posted");
    },
  });
};

export const useOpeningBalanceSummary = (companyId: string, fiscalYearId: string) => {
  return useQuery({
    queryKey: ["financeSettings", "openingBalanceSummary", companyId, fiscalYearId],
    queryFn: () => financeSettingsService.getOpeningBalanceSummary(companyId, fiscalYearId),
    enabled: Boolean(companyId && fiscalYearId),
  });
};
