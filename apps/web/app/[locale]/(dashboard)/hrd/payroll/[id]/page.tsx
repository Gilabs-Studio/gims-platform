import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PayrollDetailPage } from "@/features/hrd/payroll/components/payroll-detail-page";

interface PayrollDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PayrollDetailPageProps) {
  const { id } = await params;

  return (
    <PermissionGuard requiredPermission="payroll.read">
      <PayrollDetailPage runId={id} />
    </PermissionGuard>
  );
}
