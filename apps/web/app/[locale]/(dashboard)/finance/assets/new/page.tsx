import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssetCreatePage } from "@/features/finance/assets/components/asset-create-page";

export default function FinanceAssetCreatePage() {
  return (
    <PermissionGuard requiredPermission="asset.create">
      <AssetCreatePage />
    </PermissionGuard>
  );
}
