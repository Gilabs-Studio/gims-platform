import { AccountingMappingForm } from "@/features/finance/settings/components/accounting-mapping-form";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financeSettings" });
  return {
    title: t("title"),
  };
}

export default function AccountingMappingPage() {
  return (
    <div className="container mx-auto py-10 w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Accounting Mapping</h1>
        <p className="text-muted-foreground mt-2">
          Configure global Chart of Account mapping to automatically generate exact journal entries per module. Must follow SAP/Odoo Enterprise architectural standards.
        </p>
      </div>
      <div className="mt-8">
        <AccountingMappingForm />
      </div>
    </div>
  );
}
