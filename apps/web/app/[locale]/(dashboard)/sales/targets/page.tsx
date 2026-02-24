import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const TargetsList = dynamic(
  () =>
    import("@/features/sales/targets/components/targets-list").then(
      (mod) => ({ default: mod.TargetsList })
    ),
  { loading: () => null }
);

export default function TargetsPage() {
  return (
    <PermissionGuard requiredPermission="sales_target.read">
      <Suspense fallback={null}>
        <TargetsList />
      </Suspense>
    </PermissionGuard>
  );
}
