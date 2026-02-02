import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { OvertimePageClient } from "@/features/hrd/overtime/components/overtime-page-client";

export default function OvertimePage() {
  return (
    <PermissionGuard requiredPermission="hrd:overtime:read">
      <OvertimePageClient />
    </PermissionGuard>
  );
}
