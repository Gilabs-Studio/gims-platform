import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const CertificationList = dynamic(
  () =>
    import("@/features/hrd/certifications/components/certification-list").then(
      (mod) => ({ default: mod.CertificationList })
    ),
  { loading: () => null }
);

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "certification" });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function CertificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PermissionGuard requiredPermission="employee_certification.read">
      <Suspense fallback={null}>
        <CertificationList />
      </Suspense>
    </PermissionGuard>
  );
}
