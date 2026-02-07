"use client";

import { PageMotion } from "@/components/motion/page-motion";
import { EmployeeAssetList } from "@/features/hrd/employee-assets/components/employee-asset-list";

export default function EmployeeAssetsPage() {
  return (
    <PageMotion>
      <EmployeeAssetList />
    </PageMotion>
  );
}
