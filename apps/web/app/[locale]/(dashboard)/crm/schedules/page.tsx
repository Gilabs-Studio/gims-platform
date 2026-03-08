import { redirect } from "@/i18n/routing";

export default function SchedulesPage() {
  redirect({ href: "/crm/tasks", locale: "id" });
}
