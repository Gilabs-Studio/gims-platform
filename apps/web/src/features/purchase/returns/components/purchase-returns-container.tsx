"use client";

import { PageMotion } from "@/components/motion";
import { PurchaseReturnsList } from "./purchase-returns-list";

export function PurchaseReturnsContainer() {
  return (
    <PageMotion>
      <PurchaseReturnsList />
    </PageMotion>
  );
}
