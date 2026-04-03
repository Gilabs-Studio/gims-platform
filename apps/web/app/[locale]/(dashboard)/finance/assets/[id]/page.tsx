import { AssetDetailPage } from "@/features/finance/assets/components/asset-detail-page";

export default async function FinanceAssetDetailPage({
  params,
}: {
  params: { locale: string; id: string } | Promise<{ locale: string; id: string }>;
}) {
  const { id } = await Promise.resolve(params);
  return <AssetDetailPage id={id} />;
}
