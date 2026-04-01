import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const JournalsList = dynamic(
  () => import("./journals-list").then((m) => ({ default: m.JournalsList })),
  {
    loading: () => null,
  },
);

export const PurchaseJournalsList = dynamic(
  () =>
    import("./purchase-journals-list").then((m) => ({
      default: m.PurchaseJournalsList,
    })),
  {
    loading: () => null,
  },
);

export const CashBankJournalsList = dynamic(
  () =>
    import("./cash-bank-journals-list").then((m) => ({
      default: m.CashBankJournalsList,
    })),
  {
    loading: () => null,
  },
);

export const AdjustmentJournalsList = dynamic(
  () =>
    import("./adjustment-journals-list").then((m) => ({
      default: m.AdjustmentJournalsList,
    })),
  {
    loading: () => null,
  },
);

export const ValuationJournalsList = dynamic(
  () =>
    import("./valuation-journals-list").then((m) => ({
      default: m.ValuationJournalsList,
    })),
  {
    loading: () => null,
  },
);

export const SalesJournalsList = dynamic(
  () =>
    import("./sales-journals-list").then((m) => ({
      default: m.SalesJournalsList,
    })),
  {
    loading: () => null,
  },
);

export const InventoryJournalsList = dynamic(
  () =>
    import("./inventory-journals-list").then((m) => ({
      default: m.InventoryJournalsList,
    })),
  {
    loading: () => null,
  },
);

// Phase 4 Components
export { ReconciliationModal } from "./reconciliation-modal";
export { UnlockDialog } from "./unlock-dialog";
export { BulkApproveDialog } from "./bulk-approve-dialog";
export { ExportDialog } from "./export-dialog";

export function FinanceJournalsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <JournalsList />
      </Suspense>
    </PageMotion>
  );
}
