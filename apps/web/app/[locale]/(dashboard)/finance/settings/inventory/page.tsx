import { getTranslations } from "next-intl/server";

import { PageMotion } from "@/components/motion";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { InventorySettingsPanel } from "@/features/finance/settings/components/inventory-settings-panel";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financeSettings" });
  return {
    title: `${t("title")} - ${t("inventory.pageTitle")}`,
  };
}

export default async function InventorySettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financeSettings" });

  return (
    <PermissionGuard requiredPermission="inventory_settings.read">
      <PageMotion className="container mx-auto py-10 w-full max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight">{t("inventory.pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("inventory.pageDescription")}</p>
        <div className="mt-6">
          <InventorySettingsPanel />
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
