import { AssetListManage } from "@/features/asset-borrowing/components/asset-list-manage";

// TODO: Wrap with <PermissionGuard requiredPermission="asset_borrowing.read"> when backend permissions are deployed
export default function OfficeAssetsPage() {
  return <AssetListManage />;
}
