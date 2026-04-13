import { redirect } from "next/navigation";

export default function FinanceSettingsRedirectPage() {
  redirect("/finance/settings/accounting-mapping");
}
