// k6/scenarios/apis/finance.js
// Reusable scenario: Finance module endpoints.

import { authGet, authPost } from "../../auth-helper.js";
import { API_V1, checkSuccess } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listChartOfAccounts(auth, params = {}) {
	const p = { ...getTaggedParams("finance:coa:list"), ...params };
	return authGet(`${API_V1}/finance/chart-of-accounts`, auth, p);
}

export function listJournalEntries(auth, params = {}) {
	const p = { ...getTaggedParams("finance:journals:list"), ...params };
	return authGet(`${API_V1}/finance/journal-entries`, auth, p);
}

export function createJournalEntry(auth, payload, params = {}) {
	const p = { ...getTaggedParams("finance:journals:create"), ...params };
	return authPost(`${API_V1}/finance/journal-entries`, payload, auth, p);
}

export function listBudgets(auth, params = {}) {
	const p = { ...getTaggedParams("finance:budget:list"), ...params };
	return authGet(`${API_V1}/finance/budget`, auth, p);
}

export function listAssets(auth, params = {}) {
	const p = { ...getTaggedParams("finance:assets:list"), ...params };
	return authGet(`${API_V1}/finance/assets`, auth, p);
}

export function listAssetCategories(auth, params = {}) {
	const p = { ...getTaggedParams("finance:asset-categories:list"), ...params };
	return authGet(`${API_V1}/finance/asset-categories`, auth, p);
}

export function listAssetLocations(auth, params = {}) {
	const p = { ...getTaggedParams("finance:asset-locations:list"), ...params };
	return authGet(`${API_V1}/finance/asset-locations`, auth, p);
}

export function listBankReconciliations(auth, params = {}) {
	const p = { ...getTaggedParams("finance:bank-reconciliations:list"), ...params };
	return authGet(`${API_V1}/finance/bank-reconciliations`, auth, p);
}

export function listBankTransfers(auth, params = {}) {
	const p = { ...getTaggedParams("finance:bank-transfers:list"), ...params };
	return authGet(`${API_V1}/finance/bank-transfers`, auth, p);
}

export function listCashBankJournals(auth, params = {}) {
	const p = { ...getTaggedParams("finance:cash-bank:list"), ...params };
	return authGet(`${API_V1}/finance/cash-bank`, auth, p);
}

export function listCashBankTransactions(auth, params = {}) {
	const p = { ...getTaggedParams("finance:cash-bank-transactions:list"), ...params };
	return authGet(`${API_V1}/finance/cash-bank-transactions`, auth, p);
}

export function listFinanceReports(auth, params = {}) {
	const p = { ...getTaggedParams("finance:reports:list"), ...params };
	return authGet(`${API_V1}/finance/reports`, auth, p);
}

export function getFinanceSettings(auth, params = {}) {
	const p = { ...getTaggedParams("finance:settings:get"), ...params };
	return authGet(`${API_V1}/finance/settings`, auth, p);
}

export function listFinancialClosings(auth, params = {}) {
	const p = { ...getTaggedParams("finance:closing:list"), ...params };
	return authGet(`${API_V1}/finance/closing`, auth, p);
}

export function listFiscalYears(auth, params = {}) {
	const p = { ...getTaggedParams("finance:fiscal-years:list"), ...params };
	return authGet(`${API_V1}/finance/fiscal-years`, auth, p);
}

export function getInventorySettings(auth, params = {}) {
	const p = { ...getTaggedParams("finance:inventory-settings:get"), ...params };
	return authGet(`${API_V1}/finance/inventory-settings`, auth, p);
}

export function listJournalLines(auth, params = {}) {
	const p = { ...getTaggedParams("finance:journal-lines:list"), ...params };
	return authGet(`${API_V1}/finance/journal-lines`, auth, p);
}

export function listNonTradePayables(auth, params = {}) {
	const p = { ...getTaggedParams("finance:non-trade-payables:list"), ...params };
	return authGet(`${API_V1}/finance/non-trade-payables`, auth, p);
}

export function listOpeningBalances(auth, params = {}) {
	const p = { ...getTaggedParams("finance:opening-balance:list"), ...params };
	return authGet(`${API_V1}/finance/opening-balance`, auth, p);
}

export function listFinancePayments(auth, params = {}) {
	const p = { ...getTaggedParams("finance:payments:list"), ...params };
	return authGet(`${API_V1}/finance/payments`, auth, p);
}

export function listSystemAccountMappings(auth, params = {}) {
	const p = { ...getTaggedParams("finance:account-mappings:list"), ...params };
	return authGet(`${API_V1}/finance/settings/account-mappings`, auth, p);
}

export function listTaxConfigurations(auth, params = {}) {
	const p = { ...getTaggedParams("finance:taxes:list"), ...params };
	return authGet(`${API_V1}/finance/taxes`, auth, p);
}

export function listTaxInvoices(auth, params = {}) {
	const p = { ...getTaggedParams("finance:tax-invoices:list"), ...params };
	return authGet(`${API_V1}/finance/tax-invoices`, auth, p);
}

export function listUpCountryCosts(auth, params = {}) {
	const p = { ...getTaggedParams("finance:up-country-cost:list"), ...params };
	return authGet(`${API_V1}/finance/up-country-cost`, auth, p);
}

export function listARAPReconciliations(auth, params = {}) {
	const p = { ...getTaggedParams("finance:arap-reconciliation:list"), ...params };
	return authGet(`${API_V1}/finance/reconciliation/arap`, auth, p);
}

export function listDepreciation(auth, params = {}) {
	const p = { ...getTaggedParams("finance:depreciation:list"), ...params };
	return authGet(`${API_V1}/finance/depreciation`, auth, p);
}