import { getTranslations } from "next-intl/server";

import { PageMotion } from "@/components/motion";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FiscalYearsPanel } from "@/features/finance/settings/components/fiscal-years-panel";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financeSettings" });
  return {
    title: `${t("title")} - Fiscal Year`,
  };
}

export default async function FinanceSettingsFiscalYearsPage() {
  return (
    <PermissionGuard requiredPermission="fiscal_year.read">
      <PageMotion className="container mx-auto py-10 w-full max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight">Fiscal Year</h1>
        <p className="text-muted-foreground mt-2">
          Activate and lock fiscal years to control accounting period posting.
        </p>
        <div className="mt-6">
          <FiscalYearsPanel />
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
