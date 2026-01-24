import { Suspense } from "react";
import dynamic from "next/dynamic";

const StockValuationDashboard = dynamic(
  () =>
    import("@/features/stock/stock-valuation/components/stock-valuation-dashboard").then(
      (mod) => ({ default: mod.StockValuationDashboard }),
    ),
  {
    loading: () => null,
  },
);

export default function StockValuationPage() {
  return (
    <Suspense fallback={null}>
      <StockValuationDashboard />
    </Suspense>
  );
}
