import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

const StockOpnameList = dynamic(
  () =>
    import("@/features/stock/stock-opname/components/stock-opname-list").then(
      (mod) => ({ default: mod.StockOpnameList })
    ),
  { loading: () => null }
);

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "stock_opname" });
  return {
    title: t("title") + " | GIMS",
  };
}

export default function StockOpnamePage() {
  return (
    <PermissionGuard requiredPermission="stock_opname.read">
      <Suspense fallback={null}>
        <StockOpnameList />
      </Suspense>
    </PermissionGuard>
  );
}
