import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const BankList = dynamic(
  () =>
    import("@/features/master-data/supplier/components/bank/bank-list").then(
      (mod) => ({ default: mod.BankList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function BanksPage() {
  return (
    <PermissionGuard requiredPermission="bank.read">
      <PageMotion>
        <Suspense fallback={null}>
          <BankList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
