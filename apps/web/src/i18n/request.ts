import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import type { Locale } from "@/types/locale";
// Global/shared messages
import globalEnMessages from "./messages/en.json";
import globalIdMessages from "./messages/id.json";
// Feature messages
import { userManagementEn } from "@/features/master-data/user-management/i18n/en";
import { userManagementId } from "@/features/master-data/user-management/i18n/id";
import notificationsEnMessages from "@/features/notifications/i18n/messages/en.json";
import notificationsIdMessages from "@/features/notifications/i18n/messages/id.json";
import dashboardEnMessages from "@/features/general/dashboard/i18n/messages/en.json";
import dashboardIdMessages from "@/features/general/dashboard/i18n/messages/id.json";

import { geographicEn } from "@/features/master-data/geographic/i18n/en";
import { geographicId } from "@/features/master-data/geographic/i18n/id";
import { organizationEn } from "@/features/master-data/organization/i18n/en";
import { organizationId } from "@/features/master-data/organization/i18n/id";
import { employeeEn } from "@/features/master-data/employee/i18n/en";
import { employeeId } from "@/features/master-data/employee/i18n/id";
import { supplierEn } from "@/features/master-data/supplier/i18n/en";
import { supplierId } from "@/features/master-data/supplier/i18n/id";
import { productEn } from "@/features/master-data/product/i18n/en";
import { productId } from "@/features/master-data/product/i18n/id";
import { warehouseEn } from "@/features/master-data/warehouse/i18n/en";
import { warehouseId } from "@/features/master-data/warehouse/i18n/id";
import { paymentTermEn } from "@/features/master-data/payment-and-couriers/payment-terms/i18n/en";
import { paymentTermId } from "@/features/master-data/payment-and-couriers/payment-terms/i18n/id";
import { courierAgencyEn } from "@/features/master-data/payment-and-couriers/courier-agency/i18n/en";
import { courierAgencyId } from "@/features/master-data/payment-and-couriers/courier-agency/i18n/id";
import { soSourceEn } from "@/features/master-data/payment-and-couriers/so-source/i18n/en";
import { soSourceId } from "@/features/master-data/payment-and-couriers/so-source/i18n/id";
import { leaveTypeEn } from "@/features/master-data/leave-type/i18n/en";
import { leaveTypeId } from "@/features/master-data/leave-type/i18n/id";
import { leaveRequestEn } from "@/features/hrd/leave-request/i18n/en";
import { leaveRequestId } from "@/features/hrd/leave-request/i18n/id";
import { quotationEn } from "@/features/sales/quotation/i18n/en";
import { quotationId } from "@/features/sales/quotation/i18n/id";
import { orderEn } from "@/features/sales/order/i18n/en";
import { orderId } from "@/features/sales/order/i18n/id";
import { deliveryEn } from "@/features/sales/delivery/i18n/en";
import { deliveryId } from "@/features/sales/delivery/i18n/id";
import { invoiceEn } from "@/features/sales/invoice/i18n/en";
import { invoiceId } from "@/features/sales/invoice/i18n/id";
import { commandPaletteEn } from "@/features/command-palette/i18n/en";
import { commandPaletteId } from "@/features/command-palette/i18n/id";
import { estimationEn } from "@/features/sales/estimation/i18n/en";
import { estimationId } from "@/features/sales/estimation/i18n/id";
import { targetsEn } from "@/features/sales/targets/i18n/en";
import { targetsId } from "@/features/sales/targets/i18n/id";
import { visitI18nEn } from "@/features/sales/visit/i18n/en";
import { visitI18nId } from "@/features/sales/visit/i18n/id";
import { hrdEn } from "@/features/hrd/i18n/en";
import { hrdId } from "@/features/hrd/i18n/id";
import { inventoryEn } from "@/features/stock/inventory/i18n/en";
import { inventoryId } from "@/features/stock/inventory/i18n/id";
import { stockOpnameEn } from "@/features/stock/stock-opname/i18n/en";
import { stockOpnameId } from "@/features/stock/stock-opname/i18n/id";

// Merge all messages
const messages = {
  en: {
    ...globalEnMessages,
    userManagement: userManagementEn,
    ...notificationsEnMessages,
    ...dashboardEnMessages,
    ...geographicEn,
    organization: organizationEn,
    employee: employeeEn,
    supplier: supplierEn,
    product: productEn,
    warehouse: warehouseEn,
    paymentTerm: paymentTermEn,
    courierAgency: courierAgencyEn,
    soSource: soSourceEn,
    leaveType: leaveTypeEn,
    ...leaveRequestEn,
    ...quotationEn,
    ...orderEn,
    ...deliveryEn,
    ...invoiceEn,
    ...commandPaletteEn,
    ...estimationEn,
    ...targetsEn,
    ...targetsEn,
    ...targetsEn,
    ...visitI18nEn,
    ...hrdEn,
    ...inventoryEn,
    stock_opname: stockOpnameEn,
  },
  id: {
    ...globalIdMessages,
    userManagement: userManagementId,
    ...notificationsIdMessages,
    ...dashboardIdMessages,
    ...geographicId,
    organization: organizationId,
    employee: employeeId,
    supplier: supplierId,
    product: productId,
    warehouse: warehouseId,
    paymentTerm: paymentTermId,
    courierAgency: courierAgencyId,
    soSource: soSourceId,
    leaveType: leaveTypeId,
    ...leaveRequestId,
    ...quotationId,
    ...orderId,
    ...deliveryId,
    ...invoiceId,
    ...commandPaletteId,
    ...estimationId,
    ...targetsId,
    ...targetsId,
    ...visitI18nId,
    ...hrdId,
    ...inventoryId,
    stock_opname: stockOpnameId,
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
