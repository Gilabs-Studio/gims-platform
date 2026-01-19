import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const EmployeeList = dynamic(
  () =>
    import("@/features/master-data/employee/components/employee-list").then(
      (mod) => ({ default: mod.EmployeeList })
    ),
  {
    loading: () => null,
  }
);

export default function EmployeesPage() {
  return (
    <PermissionGuard requiredPermission="employee.read">
      <PageMotion>
        <Suspense fallback={null}>
          <EmployeeList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
