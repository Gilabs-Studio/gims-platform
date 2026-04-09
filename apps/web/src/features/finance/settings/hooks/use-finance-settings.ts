import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeSettingsService } from "../services/finance-settings-service";
import { BatchUpsertFinanceSettingsRequest } from "../types";
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
      toast.success(t("success"));
    },
    onError: (error: unknown) => {
      toast.error(resolveErrorMessage(error));
    },
  });
};
