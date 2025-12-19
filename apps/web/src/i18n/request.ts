import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import type { Locale } from "@/types/locale";
// Global/shared messages
import globalEnMessages from "./messages/en.json";
import globalIdMessages from "./messages/id.json";
// Feature messages
import userManagementEnMessages from "@/features/master-data/user-management/i18n/messages/en.json";
import userManagementIdMessages from "@/features/master-data/user-management/i18n/messages/id.json";
import companyManagementEnMessages from "@/features/master-data/company-management/i18n/messages/en.json";
import companyManagementIdMessages from "@/features/master-data/company-management/i18n/messages/id.json";
import notificationsEnMessages from "@/features/notifications/i18n/messages/en.json";
import notificationsIdMessages from "@/features/notifications/i18n/messages/id.json";
import dashboardEnMessages from "@/features/general/dashboard/i18n/messages/en.json";
import dashboardIdMessages from "@/features/general/dashboard/i18n/messages/id.json";
import purchaseRequisitionsEnMessages from "@/features/purchase/purchase-requisitions/i18n/messages/en.json";
import purchaseRequisitionsIdMessages from "@/features/purchase/purchase-requisitions/i18n/messages/id.json";

// Merge all messages
const messages = {
  en: {
    ...globalEnMessages,
    ...userManagementEnMessages,
    ...companyManagementEnMessages,
    ...notificationsEnMessages,
    ...dashboardEnMessages,
    ...purchaseRequisitionsEnMessages,
  },
  id: {
    ...globalIdMessages,
    ...userManagementIdMessages,
    ...companyManagementIdMessages,
    ...notificationsIdMessages,
    ...dashboardIdMessages,
    ...purchaseRequisitionsIdMessages,
  },
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale as keyof typeof messages],
  };
});
