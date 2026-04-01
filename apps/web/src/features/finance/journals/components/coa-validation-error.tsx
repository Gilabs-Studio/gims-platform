import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface COAValidationErrorProps {
  error: string;
  onDismiss?: () => void;
  showSettings?: boolean;
  onSettingsClick?: () => void;
}

/**
 * COAValidationError displays validation errors related to missing COA (Chart of Accounts) settings.
 * These errors typically occur when a journal posting operation fails because required accounting
 * settings are not configured in the Finance → Settings module.
 *
 * Example Error: "missing required COA settings: coa.inventory_asset, coa.cogs"
 */
export function COAValidationError({
  error,
  onDismiss,
  showSettings = true,
  onSettingsClick,
}: COAValidationErrorProps) {
  const t = useTranslations("common");
  const tFinance = useTranslations("finance");

  // Extract missing COA keys from error message
  const missingCoasMatch = error.match(/missing required COA settings: ([\w.,\s]+)/i);
  const missingCoasText = missingCoasMatch?.[1] || "";

  return (
    <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t("errors.validation_error")}</AlertTitle>
      <AlertDescription className="space-y-3">
        <div>
          <p className="font-medium text-sm">
            {tFinance?.("journals.errors.missing_coa_settings") ||
              "Missing required accounting settings"}
          </p>
          {missingCoasText && (
            <p className="text-xs text-red-700 dark:text-red-300 mt-1 font-mono bg-red-100 dark:bg-red-900 p-2 rounded">
              {missingCoasText}
            </p>
          )}
        </div>

        <div className="text-xs space-y-1">
          <p className="font-medium">{t("actions.required")}</p>
          <ol className="list-decimal list-inside space-y-1 text-red-700 dark:text-red-300">
            <li>Navigate to Finance → Settings</li>
            <li>Configure the missing COA codes</li>
            <li>Try again</li>
          </ol>
        </div>

        <div className="flex gap-2 pt-2">
          {showSettings && onSettingsClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSettingsClick}
              className="bg-white dark:bg-slate-900"
            >
              {tFinance?.("settings.open") || "Open Settings"}
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              {t("actions.dismiss")}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface SuccessBannerProps {
  message: string;
  onClose?: () => void;
}

/**
 * SuccessBanner displays a success message for successful operations.
 */
export function SuccessBanner({ message, onClose }: SuccessBannerProps) {
  return (
    <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800 dark:text-green-200">{message}</AlertTitle>
      {onClose && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="absolute right-4 top-4"
        >
          ✕
        </Button>
      )}
    </Alert>
  );
}
