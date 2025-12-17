import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

export default function RootRedirectPage() {
  // Redirect root "/" ke default locale show page, contoh: "/en/show"
  redirect(`/${routing.defaultLocale}/show`);
}
