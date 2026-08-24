import { AssetBorrowingPage } from "@/features/asset-borrowing/components/asset-borrowing-page";

// TODO: Wrap with <PermissionGuard requiredPermission="asset_borrowing.read"> when backend permissions are deployed
export default function HRDAssetBorrowingPage() {
  return <AssetBorrowingPage />;
}
