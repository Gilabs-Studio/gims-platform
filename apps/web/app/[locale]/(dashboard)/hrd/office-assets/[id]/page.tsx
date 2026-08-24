import { AssetDetailPage } from "@/features/asset-borrowing/components/asset-detail-page";

interface OfficeAssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: OfficeAssetDetailPageProps) {
  const { id } = await params;

  return <AssetDetailPage id={id} />;
}
