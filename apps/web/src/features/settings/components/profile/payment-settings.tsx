"use client";

import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Loader2,
  WalletCards,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useXenditConfig,
  useXenditConnectionStatus,
} from "@/features/pos/terminal/hooks/use-pos";

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

function FlowStep({
  icon: Icon,
  label,
  description,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function PaymentFlow() {
  const t = useTranslations("profile");

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
      <FlowStep
        icon={WalletCards}
        label={t("payment.flowPosLabel")}
        description={t("payment.flowPosDescription")}
      />
      <div className="hidden items-center text-muted-foreground lg:flex">
        <ArrowRight className="h-4 w-4" />
      </div>
      <FlowStep
        icon={CircleDollarSign}
        label={t("payment.flowXenditLabel")}
        description={t("payment.flowXenditDescription")}
      />
      <div className="hidden items-center text-muted-foreground lg:flex">
        <ArrowRight className="h-4 w-4" />
      </div>
      <FlowStep
        icon={Landmark}
        label={t("payment.flowPayoutLabel")}
        description={t("payment.flowPayoutDescription")}
      />
    </div>
  );
}

function OperationalFacts({
  environment,
  managedByPlatform,
}: {
  environment?: string;
  managedByPlatform: boolean;
}) {
  const t = useTranslations("profile");

  const facts = [
    {
      label: t("payment.providerModeLabel"),
      value: managedByPlatform ? t("payment.platformManagedMode") : t("payment.merchantManagedMode"),
    },
    {
      label: t("payment.environmentLabel"),
      value: environment ? t(`payment.environment.${environment}`) : "-",
    },
    {
      label: t("payment.moneyInLabel"),
      value: t("payment.moneyInValue"),
    },
    {
      label: t("payment.settlementLabel"),
      value: t("payment.settlementValue"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label} className="rounded-lg border bg-muted/20 p-4">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {fact.label}
          </span>
          <p className="mt-1 font-medium">{fact.value}</p>
        </div>
      ))}
    </div>
  );
}

export function PaymentSettings() {
  const t = useTranslations("profile");
  const { data: statusData, isLoading: statusLoading } = useXenditConnectionStatus();
  const { data: configData, isLoading: configLoading } = useXenditConfig();

  const status = statusData?.data;
  const config = configData?.data;
  const isConnected = status?.is_connected === true;
  const connectionStatus = status?.status ?? "not_connected";
  const managedByPlatform =
    status?.managed_by_platform === true ||
    status?.provider_mode === "platform_managed" ||
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">{t("payment.title")}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("payment.description")}</p>
        </div>
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      <Separator />

      {isConnected ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                  {t("payment.platformManagedTitle")}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
                  {managedByPlatform
                    ? t("payment.platformManagedDescription")
                    : t("payment.merchantManagedDescription")}
                </p>
              </div>
            </div>
          </div>

          <PaymentFlow />

          <OperationalFacts
            environment={config?.environment}
            managedByPlatform={managedByPlatform}
          />

          <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            {t("payment.platformManagedNote")}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <h4 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                {t("payment.notConnectedTitle")}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                {t("payment.notConnectedMessage")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
