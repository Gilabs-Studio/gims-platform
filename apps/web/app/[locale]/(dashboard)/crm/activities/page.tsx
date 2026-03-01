import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ActivityContainer } from "@/features/crm/activity/components";

export default function ActivitiesPage() {
  return (
    <PermissionGuard requiredPermission="crm_activity.read">
      <ActivityContainer />
    </PermissionGuard>
  );
}
