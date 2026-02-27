import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

export default function RootRedirectPage() {
  // Redirect root "/" ke landing page default locale
  redirect(`/${routing.defaultLocale}`);
}
