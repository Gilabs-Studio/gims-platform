import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const EmployeeContractList = dynamic(
  () =>
    import("@/features/hrd/employee-contract/components/employee-contract-list").then(
      (mod) => ({ default: mod.EmployeeContractList })
    ),
  { loading: () => null }
);

export default function EmployeeContractsPage() {
  return (
    <PermissionGuard requiredPermission="employee_contract.read">
      <Suspense fallback={null}>
        <EmployeeContractList />
      </Suspense>
    </PermissionGuard>
  );
}
