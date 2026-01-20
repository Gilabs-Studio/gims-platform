import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import type { Locale } from "@/types/locale";
// Global/shared messages
import globalEnMessages from "./messages/en.json";
import globalIdMessages from "./messages/id.json";
// Feature messages
import userManagementEnMessages from "@/features/master-data/user-management/user/i18n/messages/en.json";
import userManagementIdMessages from "@/features/master-data/user-management/user/i18n/messages/id.json";
import notificationsEnMessages from "@/features/notifications/i18n/messages/en.json";
import notificationsIdMessages from "@/features/notifications/i18n/messages/id.json";
import dashboardEnMessages from "@/features/general/dashboard/i18n/messages/en.json";
import dashboardIdMessages from "@/features/general/dashboard/i18n/messages/id.json";
import purchaseRequisitionsEnMessages from "@/features/purchase/purchase-requisitions/i18n/messages/en.json";
import purchaseRequisitionsIdMessages from "@/features/purchase/purchase-requisitions/i18n/messages/id.json";
import purchaseOrdersEnMessages from "@/features/purchase/purchase-order/i18n/messages/en.json";
import purchaseOrdersIdMessages from "@/features/purchase/purchase-order/i18n/messages/id.json";
import goodsReceiptsEnMessages from "@/features/purchase/goods-receipt/i18n/messages/en.json";
import goodsReceiptsIdMessages from "@/features/purchase/goods-receipt/i18n/messages/id.json";
import paymentPOEnMessages from "@/features/purchase/payment-po/i18n/messages/en.json";
import paymentPOIdMessages from "@/features/purchase/payment-po/i18n/messages/id.json";
import supplierInvoicesEnMessages from "@/features/purchase/supplier-invoices/i18n/messages/en.json";
import supplierInvoicesIdMessages from "@/features/purchase/supplier-invoices/i18n/messages/id.json";
import supplierInvoiceDownPaymentsEnMessages from "@/features/purchase/supplier-invoice-down-payments/i18n/messages/en.json";
import supplierInvoiceDownPaymentsIdMessages from "@/features/purchase/supplier-invoice-down-payments/i18n/messages/id.json";
import suppliersEnMessages from "@/features/master-data/partner/suppliers/i18n/messages/en.json";
import suppliersIdMessages from "@/features/master-data/partner/suppliers/i18n/messages/id.json";
import menuManagementEnMessages from "@/features/master-data/user-management/menu/i18n/messages/en.json";
import menuManagementIdMessages from "@/features/master-data/user-management/menu/i18n/messages/id.json";
import stockValuationsEnMessages from "@/features/stock/stock-valuation/i18n/messages/en.json";
import stockValuationsIdMessages from "@/features/stock/stock-valuation/i18n/messages/id.json";
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

// Merge all messages
const messages = {
  en: {
    ...globalEnMessages,
    ...userManagementEnMessages,
    ...notificationsEnMessages,
    ...dashboardEnMessages,
    ...purchaseRequisitionsEnMessages,
    ...purchaseOrdersEnMessages,
    ...goodsReceiptsEnMessages,
    ...paymentPOEnMessages,
    ...supplierInvoicesEnMessages,
    ...supplierInvoiceDownPaymentsEnMessages,
    ...suppliersEnMessages,
    ...menuManagementEnMessages,
    ...stockValuationsEnMessages,
    ...geographicEn,
    organization: organizationEn,
    employee: employeeEn,
    supplier: supplierEn,
    product: productEn,
    warehouse: warehouseEn,
  },
  id: {
    ...globalIdMessages,
    ...userManagementIdMessages,
    ...notificationsIdMessages,
    ...dashboardIdMessages,
    ...purchaseRequisitionsIdMessages,
    ...purchaseOrdersIdMessages,
    ...goodsReceiptsIdMessages,
    ...paymentPOIdMessages,
    ...supplierInvoicesIdMessages,
    ...suppliersIdMessages,
    ...supplierInvoiceDownPaymentsIdMessages,
    ...menuManagementIdMessages,
    ...stockValuationsIdMessages,
    ...geographicId,
    organization: organizationId,
    employee: employeeId,
    supplier: supplierId,
    product: productId,
    warehouse: warehouseId,
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
