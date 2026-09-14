import { AssetDetailPage } from "@/features/asset-borrowing/components/asset-detail-page";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

// TODO: Wrap with <PermissionGuard requiredPermission="asset_borrowing.read"> when backend permissions are deployed
export default async function Page({ params }: AssetDetailPageProps) {
  const { id } = await params;

  return <AssetDetailPage id={id} />;
}
