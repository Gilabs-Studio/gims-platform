"use client";

import { PageMotion } from "@/components/motion";
import { SalesReturnsList } from "./sales-returns-list";

export function SalesReturnsContainer() {
  return (
    <PageMotion>
      <SalesReturnsList />
    </PageMotion>
  );
}
