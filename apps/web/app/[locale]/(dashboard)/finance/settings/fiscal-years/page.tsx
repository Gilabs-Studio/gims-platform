import { getTranslations } from "next-intl/server";

import { PageMotion } from "@/components/motion";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FiscalYearsPanel } from "@/features/finance/settings/components/fiscal-years-panel";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financeSettings" });
  return {
    title: `${t("title")} - ${t("fiscalYears.pageTitle")}`,
  };
}

export default async function FinanceSettingsFiscalYearsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financeSettings" });

  return (
    <PermissionGuard requiredPermission="fiscal_year.read">
      <PageMotion className="container mx-auto w-full max-w-6xl py-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("fiscalYears.pageTitle")}</h1>
          <p className="text-muted-foreground">{t("fiscalYears.pageDescription")}</p>
        </div>
        <div className="mt-6">
          <FiscalYearsPanel />
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
