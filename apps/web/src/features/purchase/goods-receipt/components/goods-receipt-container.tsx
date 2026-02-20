"use client";

import { PageMotion } from "@/components/motion";

import { GoodsReceiptsList } from "./goods-receipts-list";

export function GoodsReceiptContainer() {
  return (
    <PageMotion>
      <GoodsReceiptsList />
    </PageMotion>
  );
}
