import { redirect } from "next/navigation";

/**
 * The asset detail page has been replaced by a modal in the assets list.
 * Redirect any direct navigation to this route back to the assets list.
 */
export default async function FinanceAssetDetailPage({
  params,
}: {
  params: { locale: string; id: string } | Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await Promise.resolve(params);
  redirect(`/${locale}/finance/assets`);
}
