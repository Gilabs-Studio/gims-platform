import { getTranslations } from "next-intl/server";

import { PageMotion } from "@/components/motion";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { OpeningBalanceWizard } from "@/features/finance/settings/components/opening-balance-wizard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financeSettings" });
  return {
    title: `${t("title")} - ${t("openingBalance.pageTitle")}`,
  };
}

export default async function OpeningBalancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financeSettings" });

  return (
    <PermissionGuard requiredPermission="opening_balance.read">
      <PageMotion className="container mx-auto py-10 w-full max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight">{t("openingBalance.pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("openingBalance.pageDescription")}</p>
        <div className="mt-6">
          <OpeningBalanceWizard />
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
