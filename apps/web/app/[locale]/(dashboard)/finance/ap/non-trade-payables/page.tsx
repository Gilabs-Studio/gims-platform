import { redirect } from "next/navigation";

export default function CanonicalFinanceRouteRedirectPage() {
  redirect("/finance/non-trade-payables");
}