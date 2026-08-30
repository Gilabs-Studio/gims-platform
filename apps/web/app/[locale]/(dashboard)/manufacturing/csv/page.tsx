import { redirect } from "@/i18n/routing";

export default async function ManufacturingCsvIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/manufacturing/csv/validation", locale });
}
