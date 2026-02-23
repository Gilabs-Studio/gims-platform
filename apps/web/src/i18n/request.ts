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
import { employeeAssetsEn } from "@/features/hrd/employee-assets/i18n/en";
import { employeeAssetsId } from "@/features/hrd/employee-assets/i18n/id";
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
import { settingsEn } from "@/features/settings/i18n/en";
import { settingsId } from "@/features/settings/i18n/id";
import { evaluationEn } from "@/features/hrd/evaluation/i18n/en";
import { evaluationId } from "@/features/hrd/evaluation/i18n/id";
import { recruitmentEn } from "@/features/hrd/recruitment/i18n/en";
import { recruitmentId } from "@/features/hrd/recruitment/i18n/id";

import { purchaseRequisitionEn } from "@/features/purchase/requisitions/i18n/en";
import { purchaseRequisitionId } from "@/features/purchase/requisitions/i18n/id";

import { purchaseOrderEn } from "@/features/purchase/orders/i18n/en";
import { purchaseOrderId } from "@/features/purchase/orders/i18n/id";

import { goodsReceiptEn } from "@/features/purchase/goods-receipt/i18n/en";
import { goodsReceiptId } from "@/features/purchase/goods-receipt/i18n/id";

import { supplierInvoiceEn } from "@/features/purchase/supplier-invoices/i18n/en";
import { supplierInvoiceId } from "@/features/purchase/supplier-invoices/i18n/id";

import { supplierInvoiceDPEn } from "@/features/purchase/supplier-invoice-down-payments/i18n/en";
import { supplierInvoiceDPId } from "@/features/purchase/supplier-invoice-down-payments/i18n/id";

import { purchasePaymentEn } from "@/features/purchase/payments/i18n/en";
import { purchasePaymentId } from "@/features/purchase/payments/i18n/id";

import { financeCoaEn } from "@/features/finance/coa/i18n/en";
import { financeCoaId } from "@/features/finance/coa/i18n/id";
import { financeJournalsEn } from "@/features/finance/journals/i18n/en";
import { financeJournalsId } from "@/features/finance/journals/i18n/id";
import { financeBankAccountsEn } from "@/features/finance/bank-accounts/i18n/en";
import { financeBankAccountsId } from "@/features/finance/bank-accounts/i18n/id";
import { financePaymentsEn } from "@/features/finance/payments/i18n/en";
import { financePaymentsId } from "@/features/finance/payments/i18n/id";
import { financeBudgetEn } from "@/features/finance/budget/i18n/en";
import { financeBudgetId } from "@/features/finance/budget/i18n/id";
import { financeCashBankEn } from "@/features/finance/cash-bank/i18n/en";
import { financeCashBankId } from "@/features/finance/cash-bank/i18n/id";
import { financeAgingReportsEn } from "@/features/finance/aging-reports/i18n/en";
import { financeAgingReportsId } from "@/features/finance/aging-reports/i18n/id";
import { financeAssetCategoriesEn } from "@/features/finance/asset-categories/i18n/en";
import { financeAssetCategoriesId } from "@/features/finance/asset-categories/i18n/id";
import { financeAssetLocationsEn } from "@/features/finance/asset-locations/i18n/en";
import { financeAssetLocationsId } from "@/features/finance/asset-locations/i18n/id";
import { financeAssetsEn } from "@/features/finance/assets/i18n/en";
import { financeAssetsId } from "@/features/finance/assets/i18n/id";
import { financeClosingEn } from "@/features/finance/closing/i18n/en";
import { financeClosingId } from "@/features/finance/closing/i18n/id";
import { financeTaxInvoicesEn } from "@/features/finance/tax-invoices/i18n/en";
import { financeTaxInvoicesId } from "@/features/finance/tax-invoices/i18n/id";
import { financeNonTradePayablesEn } from "@/features/finance/non-trade-payables/i18n/en";
import { financeNonTradePayablesId } from "@/features/finance/non-trade-payables/i18n/id";
import { financeUpCountryCostEn } from "@/features/finance/up-country-cost/i18n/en";
import { financeUpCountryCostId } from "@/features/finance/up-country-cost/i18n/id";
import { financeSalaryEn } from "@/features/finance/salary/i18n/en";
import { financeSalaryId } from "@/features/finance/salary/i18n/id";

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
    ...employeeAssetsEn,
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
    ...settingsEn,
    ...evaluationEn,
    ...recruitmentEn,
    purchaseRequisition: purchaseRequisitionEn,
    purchaseOrder: purchaseOrderEn,
    goodsReceipt: goodsReceiptEn,
    supplierInvoice: supplierInvoiceEn,
    supplierInvoiceDP: supplierInvoiceDPEn,
    purchasePayment: purchasePaymentEn,
    financeCoa: financeCoaEn,
    financeJournals: financeJournalsEn,
    financeBankAccounts: financeBankAccountsEn,
    financePayments: financePaymentsEn,
    financeBudget: financeBudgetEn,
    financeCashBank: financeCashBankEn,
    financeAgingReports: financeAgingReportsEn,
    financeAssetCategories: financeAssetCategoriesEn,
    financeAssetLocations: financeAssetLocationsEn,
    financeAssets: financeAssetsEn,
    financeClosing: financeClosingEn,
    financeTaxInvoices: financeTaxInvoicesEn,
    financeNonTradePayables: financeNonTradePayablesEn,
    financeUpCountryCost: financeUpCountryCostEn,
    financeSalary: financeSalaryEn,
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
    ...employeeAssetsId,
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
    ...settingsId,
    ...evaluationId,
    ...recruitmentId,
    purchaseRequisition: purchaseRequisitionId,
    purchaseOrder: purchaseOrderId,
    goodsReceipt: goodsReceiptId,
    supplierInvoice: supplierInvoiceId,
    supplierInvoiceDP: supplierInvoiceDPId,
    purchasePayment: purchasePaymentId,
    financeCoa: financeCoaId,
    financeJournals: financeJournalsId,
    financeBankAccounts: financeBankAccountsId,
    financePayments: financePaymentsId,
    financeBudget: financeBudgetId,
    financeCashBank: financeCashBankId,
    financeAgingReports: financeAgingReportsId,
    financeAssetCategories: financeAssetCategoriesId,
    financeAssetLocations: financeAssetLocationsId,
    financeAssets: financeAssetsId,
    financeClosing: financeClosingId,
    financeTaxInvoices: financeTaxInvoicesId,
    financeNonTradePayables: financeNonTradePayablesId,
    financeUpCountryCost: financeUpCountryCostId,
    financeSalary: financeSalaryId,
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
