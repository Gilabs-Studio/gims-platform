import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ScheduleContainer } from "@/features/crm/schedule/components";

export default function SchedulesPage() {
  return (
    <PermissionGuard requiredPermission="crm_schedule.read">
      <ScheduleContainer />
    </PermissionGuard>
  );
}
