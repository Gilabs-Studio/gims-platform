import { redirect } from "@/i18n/routing";

export default async function ManufacturingRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/manufacturing/oee", locale });
}
