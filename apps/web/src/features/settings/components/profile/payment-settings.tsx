"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle2, WifiOff, Plug, Unplug, CircleHelp } from "lucide-react";
import {
  useXenditConnectionStatus,
  useXenditConfig,
  useConnectXendit,
  useUpdateXenditConfig,
  useDisconnectXendit,
} from "@/features/pos/terminal/hooks/use-pos";
import type { ConnectXenditRequest, UpdateXenditConfigRequest } from "@/features/pos/terminal/types";

// Schemas are created inside components to allow localized validation messages

function FieldHelp({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label={label}
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Connection status badge ──────────────────────────────────────────────────

function ConnectionStatusBadge({ status }: { status: string }) {
  const t = useTranslations("profile");
  if (status === "connected") {
    return (
      <Badge variant="success" className="gap-1.5 px-2.5 py-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("payment.connected")}
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge variant="destructive" className="gap-1.5 px-2.5 py-1">
        <WifiOff className="h-3.5 w-3.5" />
        {t("payment.suspended")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-muted-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      {t("payment.notConnectedBadge")}
    </Badge>
  );
}

// ─── Connect form ─────────────────────────────────────────────────────────────

function ConnectXenditForm() {
  const t = useTranslations("profile");
  const connectMutation = useConnectXendit();

  const connectSchema = z.object({
    secret_key: z.string().min(1, t("payment.secretKey.required")),
    xendit_account_id: z.string().optional(),
    business_name: z.string().optional(),
    environment: z.enum(["sandbox", "production"]),
    webhook_token: z.string().optional(),
  });

  type ConnectFormValues = z.infer<typeof connectSchema>;

  const form = useForm<ConnectFormValues>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      secret_key: "",
      xendit_account_id: "",
      business_name: "",
      environment: "sandbox",
      webhook_token: "",
    },
  });

  async function onSubmit(values: ConnectFormValues) {
    const payload: ConnectXenditRequest = {
      secret_key: values.secret_key,
      xendit_account_id: values.xendit_account_id || undefined,
      business_name: values.business_name || undefined,
      environment: values.environment,
      webhook_token: values.webhook_token || undefined,
    };
    await connectMutation.mutateAsync(payload);
  }

  return (
    <TooltipProvider delayDuration={120}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="secret_key">
            {t("payment.secretKey.label")} <span className="text-destructive">*</span>
          </Label>
          <FieldHelp
            label={t("payment.secretKey.label")}
            content={t("payment.secretKey.help")}
          />
        </div>
        <Input
          id="secret_key"
          type="password"
          placeholder={t("payment.secretKey.placeholder")}
          {...form.register("secret_key")}
        />
        {form.formState.errors.secret_key && (
          <p className="text-xs text-destructive">{form.formState.errors.secret_key.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="xendit_account_id">{t("payment.accountId.label")}</Label>
          <FieldHelp
            label={t("payment.accountId.label")}
            content={t("payment.accountId.help")}
          />
        </div>
        <Input
          id="xendit_account_id"
          placeholder={t("payment.accountId.placeholder")}
          {...form.register("xendit_account_id")}
        />
        <p className="text-xs text-muted-foreground">{t("payment.accountId.note")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="business_name">{t("payment.businessNameLabel")}</Label>
        <Input
          id="business_name"
          placeholder={t("payment.businessNamePlaceholder")}
          {...form.register("business_name")}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="environment">
            {t("payment.environmentLabel")} <span className="text-destructive">*</span>
          </Label>
          <FieldHelp
            label={t("payment.environmentLabel")}
            content={t("payment.environmentHelp")}
          />
        </div>
        <Select
          defaultValue="sandbox"
          onValueChange={(v) =>
            form.setValue("environment", v as "sandbox" | "production")
          }
        >
          <SelectTrigger id="environment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">{t("payment.environmentSandbox")}</SelectItem>
            <SelectItem value="production">{t("payment.environmentProduction")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="webhook_token">{t("payment.webhook.label")}</Label>
          <FieldHelp
            label={t("payment.webhook.label")}
            content={t("payment.webhook.help")}
          />
        </div>
        <Input
          id="webhook_token"
          type="password"
          placeholder={t("payment.webhook.placeholder")}
          {...form.register("webhook_token")}
        />
      </div>

      <Button
        type="submit"
        className="cursor-pointer gap-2"
        disabled={connectMutation.isPending}
      >
        {connectMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plug className="h-4 w-4" />
        )}
        {t("payment.connectButton")}
      </Button>
      </form>
    </TooltipProvider>
  );
}

// ─── Update form ──────────────────────────────────────────────────────────────

function UpdateXenditConfigForm({
  currentEnvironment,
  currentBusinessName,
}: {
  currentEnvironment?: string;
  currentBusinessName?: string;
}) {
  const t = useTranslations("profile");
  const updateMutation = useUpdateXenditConfig();

  const updateSchema = z.object({
    environment: z.enum(["sandbox", "production"]).optional(),
    business_name: z.string().optional(),
    is_active: z.boolean().optional(),
  });

  type UpdateFormValues = z.infer<typeof updateSchema>;

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      environment: (currentEnvironment as "sandbox" | "production") ?? "sandbox",
      business_name: currentBusinessName ?? "",
    },
  });

  async function onSubmit(values: UpdateFormValues) {
    const payload: UpdateXenditConfigRequest = {
      environment: values.environment,
      business_name: values.business_name || undefined,
    };
    await updateMutation.mutateAsync(payload);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="upd_business_name">{t("payment.businessNameLabel")}</Label>
        <Input
          id="upd_business_name"
          placeholder={t("payment.businessNamePlaceholder")}
          {...form.register("business_name")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="upd_environment">{t("payment.environmentLabel")}</Label>
        <Select
          defaultValue={currentEnvironment ?? "sandbox"}
          onValueChange={(v) =>
            form.setValue("environment", v as "sandbox" | "production")
          }
        >
          <SelectTrigger id="upd_environment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">{t("payment.environmentSandbox")}</SelectItem>
            <SelectItem value="production">{t("payment.environmentProduction")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="cursor-pointer"
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {t("saveChanges")}
      </Button>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PaymentSettings() {
  const t = useTranslations("profile");
  const [showConnectForm, setShowConnectForm] = useState(false);
  const { data: statusData, isLoading: statusLoading } = useXenditConnectionStatus();
  const { data: configData, isLoading: configLoading } = useXenditConfig();
  const disconnectMutation = useDisconnectXendit();

  const isConnected = statusData?.data?.is_connected === true;
  const connectionStatus = statusData?.data?.status ?? "not_connected";
  const config = configData?.data;
  const managedByPlatform =
    statusData?.data?.managed_by_platform === true ||
    statusData?.data?.provider_mode === "platform_managed" ||
    config?.managed_by_platform === true ||
    config?.provider_mode === "platform_managed";

  if (statusLoading || configLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t("payment.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">{t("payment.title")}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t("payment.description")}</p>
        </div>
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      <Separator />

      {isConnected && config ? (
        <div className="space-y-6">
          {managedByPlatform ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                      {t("payment.platformManagedTitle")}
                    </h4>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      {t("payment.platformManagedDescription")}
                    </p>
                  </div>
                  <Badge variant="success" className="gap-1.5 px-2.5 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("payment.connected")}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {t("payment.providerModeLabel")}
                  </span>
                  <span>{t("payment.platformManagedMode")}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {t("payment.environmentLabel")}
                  </span>
                  <span className="capitalize">{config.environment ?? "-"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {t("payment.settlementLabel")}
                  </span>
                  <span>{t("payment.settlementValue")}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {t("payment.statusLabel")}
                  </span>
                  <span>{t("payment.platformManagedStatus")}</span>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/35 p-4 text-sm text-muted-foreground">
                {t("payment.platformManagedNote")}
              </div>
            </div>
          ) : (
            <>
              {/* Current config overview */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t("payment.accountDetailsHeader")}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      {t("payment.businessNameLabel")}
                    </span>
                    <span>{config.business_name || "-"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      {t("payment.environmentLabel")}
                    </span>
                    <span className="capitalize">{config.environment ?? "-"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      {t("payment.xenditAccountIdLabel")}
                    </span>
                    <span className="font-mono text-xs">{config.xendit_account_id || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      {t("payment.statusLabel")}
                    </span>
                    <span>
                      {config.connection_status === "connected" ? (
                        <Badge variant="success" className="capitalize gap-1.5 px-2.5 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("payment.connected")}
                        </Badge>
                      ) : config.connection_status === "suspended" ? (
                        <Badge variant="destructive" className="capitalize gap-1.5 px-2.5 py-1">
                          <WifiOff className="h-3.5 w-3.5" />
                          {t("payment.suspended")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="capitalize gap-1.5 px-2.5 py-1 text-muted-foreground">
                          {t("payment.notConnectedBadge")}
                        </Badge>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Update form */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t("payment.updateSettingsHeader")}</h4>
                <UpdateXenditConfigForm
                  currentEnvironment={config.environment}
                  currentBusinessName={config.business_name}
                />
              </div>

              <Separator />

              {/* Danger zone */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-destructive">{t("payment.dangerZoneTitle")}</h4>
                <p className="text-sm text-muted-foreground">{t("payment.dangerZoneDescription")}</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="cursor-pointer gap-2">
                      <Unplug className="h-4 w-4" />
                      {t("payment.disconnectButton")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("payment.disconnectDialogTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("payment.disconnectDialogDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="cursor-pointer">{t("payment.cancelButton")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="cursor-pointer"
                        onClick={() => disconnectMutation.mutate()}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {t("payment.disconnectAction")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {!showConnectForm ? (
            <div className="flex flex-col items-start gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">{t("payment.notConnectedMessage")}</p>
              </div>
              <Button className="cursor-pointer gap-2" onClick={() => setShowConnectForm(true)}>
                <Plug className="h-4 w-4" />
                {t("payment.connectButton")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t("payment.connectHeader")}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-muted-foreground"
                  onClick={() => setShowConnectForm(false)}
                >
                  {t("payment.cancelButton")}
                </Button>
              </div>
              <ConnectXenditForm />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
