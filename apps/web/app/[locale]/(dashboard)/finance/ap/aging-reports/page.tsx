import { redirect } from "next/navigation";

export default function FinanceAPAgingReportsRedirectPage() {
  redirect("/finance/aging-reports?tab=ap");
}
