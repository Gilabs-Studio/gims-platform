import { redirect } from "next/navigation";

export default function FinanceARAgingReportsRedirectPage() {
  redirect("/finance/aging-reports?tab=ar");
}
