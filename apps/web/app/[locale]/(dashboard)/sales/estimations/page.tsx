import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const EstimationList = dynamic(
  () =>
    import("@/features/sales/estimation/components/estimation-list").then(
      (mod) => ({ default: mod.EstimationList })
    ),
  { loading: () => null }
);

export default function EstimationPage() {
  return (
    <PermissionGuard requiredPermission="sales_estimation.read">
      <Suspense fallback={null}>
        <EstimationList />
      </Suspense>
    </PermissionGuard>
  );
}
