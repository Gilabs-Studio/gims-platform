import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AreaMappingContainer } from "@/features/crm/area-mapping/components";

export default function AreaMappingPage() {
  return (
    <PermissionGuard requiredPermission="crm_area_mapping.read">
      <AreaMappingContainer />
    </PermissionGuard>
  );
}
