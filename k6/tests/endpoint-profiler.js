// k6/tests/endpoint-profiler.js
// K6 Endpoint Profiler — Single ramping profile that hits all GIMS endpoints
// tagged with {endpoint, module, tier} for detailed per-endpoint analysis.
//
// Usage:
//   k6 run --out json=k6/reports/profiler-test.json k6/tests/endpoint-profiler.js
//   k6 run -e PROFILER_VUS=20 -e PROFILER_DURATION=5m k6/tests/endpoint-profiler.js
//   k6 run -e RELAXED=1 k6/tests/endpoint-profiler.js   # loosen thresholds for local dev

import { check, sleep } from "k6";
import { PROFILER_WORKLOAD, THRESHOLDS, API_V1, CREDENTIALS, AUTH_ENDPOINTS } from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";
import { getCredentialForVU } from "../data/multi-tenant-credentials.js";
import { parseBody, firstItem, requiredId, pickWorkflowTarget } from "../lib/helpers.js";
import { ErrorHandler } from "../lib/error-handler.js";
import { recordEndpointLatency } from "../lib/metrics.js";

// ── API scenario imports ──────────────────────────────────────────────────────
import { listQuotations, createQuotation, listOrders, listDeliveryOrders, listInvoices, listPayments, listSalesReturns, listSalesTargets, listSalesVisits, listInvoiceDownPayments, listReceivablesRecap } from "../scenarios/apis/sales.js";
import { listPurchaseOrders, listGoodsReceipts, listPurchaseRequisitions, listPurchaseReturns, listPurchasePayments, listSupplierInvoices, listSupplierInvoiceDownPayments, listPayableRecap } from "../scenarios/apis/purchase.js";
import { listChartOfAccounts, listJournalEntries, listBudgets, listAssets, listAssetCategories, listAssetLocations, listBankReconciliations, listBankTransfers, listCashBankJournals, listCashBankTransactions, listFinanceReports, getFinanceSettings, listFinancialClosings, listFiscalYears, getInventorySettings, listJournalLines, listNonTradePayables, listOpeningBalances, listFinancePayments, listSystemAccountMappings, listTaxConfigurations, listTaxInvoices, listUpCountryCosts, listARAPReconciliations, listDepreciation } from "../scenarios/apis/finance.js";
import { listAttendance, listLeaveRequests, listEmployees, listWorkSchedules, listHolidays, listOvertimeRequests, listEmployeeEvaluations, listEvaluationCriteria, listEvaluationGroups, listRecruitmentRequests, listRecruitmentApplicants, listSalaryStructures } from "../scenarios/apis/hrd.js";
import { listStock, getStockMetrics, listMovements } from "../scenarios/apis/inventory.js";
import { listUsers, listRoles, listProducts, createProduct, listCustomers, listSuppliers, listWarehouses, listCurrencies } from "../scenarios/apis/master-data.js";
import { listProductCategories, listProductBrands, listProductSegments, listProductTypes, listUnitsOfMeasure, listPackaging, listProcurementTypes } from "../scenarios/apis/product.js";
import { listLeads, listDeals, listContacts, listActivities, listActivityTypes, listTasks, listSchedules, listVisitReports, listPipelineStages, listAreaMappings, listLeadSources, listLeadStatuses, listContactRoles, listLeadAutomations, listAreaCaptures } from "../scenarios/apis/crm.js";
import { listPOSOrders, listPOSSessions, listFloorPlans, getPOSConfig } from "../scenarios/apis/pos.js";
import { listCountries, listProvinces, listCities, listDistricts, listVillages, getMapData } from "../scenarios/apis/geographic.js";
import { getSalesOverview, getProductAnalysis, getGeoPerformance, getCustomerResearch, getSupplierResearch } from "../scenarios/apis/report.js";
import { listStockOpnames } from "../scenarios/apis/stock-opname.js";
import { listNotifications, listLoyaltyPrograms, listLoyaltyMembers, getOnboardingStatus, listSupplierTypes, listSupplierBanks } from "../scenarios/apis/supporting.js";
import { listAISessions, listAIAdminActions, listAIAdminIntents, listTravelPlans, listFeedbackForms } from "../scenarios/apis/misc.js";
import { listPaymentTerms, listBankAccounts, listLeaveTypes, listCourierAgencies, listSOSources } from "../scenarios/apis/core.js";
import { listCompanies, listBusinessUnits, listDivisions, listOutlets, listAreas, listOrgEmployees, listJobPositions, listBusinessTypes } from "../scenarios/apis/organization.js";
import { healthCheck, pingCheck, apiVersion } from "../scenarios/apis/public-endpoints.js";

// ── E2E workflow imports ─────────────────────────────────────────────────────
import { revenueCycle } from "../scenarios/e2e/revenue-cycle.js";
import { purchaseCycle } from "../scenarios/e2e/purchase-cycle.js";
import { journalEntryCycle } from "../scenarios/e2e/journal-entry.js";
import { attendanceCheckinCycle } from "../scenarios/e2e/attendance-checkin.js";
import { dashboardOverview } from "../scenarios/e2e/dashboard-overview.js";

// ── k6 Options ────────────────────────────────────────────────────────────────
export const options = {
	scenarios: {
		profiler: {
			executor: "ramping-vus",
			startVUs: 1,
			stages: PROFILER_WORKLOAD.stages,
			gracefulStop: "30s",
		},
	},
	thresholds: THRESHOLDS,
	// Don't abort on threshold failures — we want full profiling data
};

// ── Setup: authenticate and collect prerequisite IDs ─────────────────────────
export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		console.error("Profiler setup: authentication failed, aborting");
		return { auth, customerId: null, productId: null, warehouseId: null, supplierId: null, paymentTermsId: null, salesRepId: null, businessUnitId: null, bankAccountId: null, companyId: null, coaDebitId: null, coaCreditId: null, employeeId: null, leaveTypeId: null, batchId: null, batchableProducts: [] };
	}

	// Collect prerequisite IDs from list endpoints
	let customerId = null, productId = null, warehouseId = null, supplierId = null;
	let paymentTermsId = null, salesRepId = null, businessUnitId = null, bankAccountId = null;
	let companyId = null, coaDebitId = null, coaCreditId = null;
	let employeeId = null, leaveTypeId = null, batchId = null;
	let batchableProducts = [];

	try {
		// Products
		const productsRes = listProducts(auth);
		const productData = parseBody(productsRes);
		if (productData?.data) {
			const items = Array.isArray(productData.data) ? productData.data : productData.data.items || [];
			productId = items[0]?.id;
			batchableProducts = items.filter(p => p.stock_quantity > 0 || p.available_quantity > 0).map(p => ({ productId: p.id }));
		}

		// Customers
		const customersRes = listCustomers(auth);
		const customerData = parseBody(customersRes);
		if (customerData?.data) {
			const items = Array.isArray(customerData.data) ? customerData.data : customerData.data.items || [];
			customerId = items[0]?.id;
		}

		// Warehouses
		const warehousesRes = listWarehouses(auth);
		const warehouseData = parseBody(warehousesRes);
		if (warehouseData?.data) {
			const items = Array.isArray(warehouseData.data) ? warehouseData.data : warehouseData.data.items || [];
			warehouseId = items[0]?.id;
		}

		// Suppliers
		const suppliersRes = listSuppliers(auth);
		const supplierData = parseBody(suppliersRes);
		if (supplierData?.data) {
			const items = Array.isArray(supplierData.data) ? supplierData.data : supplierData.data.items || [];
			supplierId = items[0]?.id;
		}

		// Chart of accounts (for journal entries — pick EXPENSE/REVENUE accounts, skip trade control)
		const coaRes = listChartOfAccounts(auth);
		const coaData = parseBody(coaRes);
		if (coaData?.data) {
			const items = Array.isArray(coaData.data) ? coaData.data : coaData.data.items || [];
			// Only use EXPENSE or REVENUE accounts — safe for manual journals
			const safeAccounts = items.filter(a => {
				const type = (a.type || "").toUpperCase();
				return (type === "EXPENSE" || type === "REVENUE" || type === "EQUITY") && a.is_postable !== false;
			});
			const usable = safeAccounts.length >= 2 ? safeAccounts : items;
			if (usable.length >= 2) {
				coaDebitId = usable[0]?.id;
				coaCreditId = usable[1]?.id;
			}
		}

		// Employees
		const empRes = listEmployees(auth);
		const empData = parseBody(empRes);
		if (empData?.data) {
			const items = Array.isArray(empData.data) ? empData.data : empData.data.items || [];
			employeeId = items[0]?.id;
		}

		// Payment Terms (critical for SQ/PO creation)
		const ptRes = listPaymentTerms(auth);
		const ptData = parseBody(ptRes);
		if (ptData?.data) {
			const items = Array.isArray(ptData.data) ? ptData.data : ptData.data.items || [];
			paymentTermsId = items[0]?.id;
		}

		// Bank Accounts (critical for payment creation)
		const baRes = listBankAccounts(auth);
		const baData = parseBody(baRes);
		if (baData?.data) {
			const items = Array.isArray(baData.data) ? baData.data : baData.data.items || [];
			bankAccountId = items[0]?.id;
		}

		// Leave Types (for leave request workflow)
		const ltRes = listLeaveTypes(auth);
		const ltData = parseBody(ltRes);
		if (ltData?.data) {
			const items = Array.isArray(ltData.data) ? ltData.data : ltData.data.items || [];
			leaveTypeId = items[0]?.id;
		}

		// Parse first user for company/business unit IDs
		const meRes = authGet(`${API_V1}/users/me`, auth, { tags: { name: "auth:me", endpoint: "auth:me", module: "auth", tier: "crud" } });
		const meData = parseBody(meRes);
		if (meData?.data) {
			companyId = meData.data.company_id || meData.data.companyId;
			businessUnitId = meData.data.business_unit_id || meData.data.businessUnitId;
			salesRepId = meData.data.employee_id || meData.data.id;
		}

		// Fallback: fetch companyId from Organization if /users/me didn't provide it
		if (!companyId) {
			const compRes = listCompanies(auth);
			const compData = parseBody(compRes);
			if (compData?.data) {
				const items = Array.isArray(compData.data) ? compData.data : compData.data.items || [];
				companyId = items[0]?.id;
			}
		}

		// Fallback: fetch businessUnitId from Organization if /users/me didn't provide it
		if (!businessUnitId) {
			const buRes = listBusinessUnits(auth);
			const buData = parseBody(buRes);
			if (buData?.data) {
				const items = Array.isArray(buData.data) ? buData.data : buData.data.items || [];
				businessUnitId = items[0]?.id;
			}
		}

		// Fallback: use first employee as salesRepId if /users/me didn't provide it
		if (!salesRepId && employeeId) {
			salesRepId = employeeId;
		}
	} catch (e) {
		console.error(`Profiler setup error (continuing): ${e.message}`);
	}

	// Use sensible defaults for IDs that weren't found in setup
	if (batchableProducts.length === 0 && productId) {
		batchableProducts = [{ productId }];
	}

	// Fetch outlet coordinates for GPS-based clock-in
	let officeLatitude = -6.2088;
	let officeLongitude = 106.8456;
	let outletId = null;
	try {
		const outletRes = listOutlets(auth);
		const outletData = parseBody(outletRes);
		if (outletData?.data) {
			const items = Array.isArray(outletData.data) ? outletData.data : outletData.data.items || [];
			outletId = items[0]?.id;
			const outletWithCoords = items.find(o => o.latitude && o.longitude);
			if (outletWithCoords) {
				officeLatitude = outletWithCoords.latitude;
				officeLongitude = outletWithCoords.longitude;
			}
		}
	} catch (e) {
		// Use defaults
	}

	return {
		auth,
		customerId: customerId || "SETUP_MISSING",
		productId: productId || "SETUP_MISSING",
		warehouseId: warehouseId || "SETUP_MISSING",
		supplierId: supplierId || "SETUP_MISSING",
		paymentTermsId: paymentTermsId || "SETUP_MISSING",
		salesRepId: salesRepId || "SETUP_MISSING",
		businessUnitId: businessUnitId || "SETUP_MISSING",
		bankAccountId: bankAccountId || "SETUP_MISSING",
		companyId: companyId || "SETUP_MISSING",
		coaDebitId: coaDebitId || "SETUP_MISSING",
		coaCreditId: coaCreditId || "SETUP_MISSING",
		employeeId: employeeId || "SETUP_MISSING",
		leaveTypeId: leaveTypeId || null,
		batchId: batchId || "SETUP_MISSING",
		batchableProducts,
		officeLatitude,
		officeLongitude,
		outletId: outletId || "SETUP_MISSING",
	};
}



// ── Default function: profile all endpoints ──────────────────────────────────
const eh = new ErrorHandler({ logDetails: false });

export default function (data) {
	// Multi-tenant: each VU uses a different tenant's credentials
	const vuCreds = getCredentialForVU(__VU);
	const auth = getAuthToken(vuCreds) || data.auth;

	if (!auth) {
		console.error(`VU ${__VU}: No auth token available, skipping iteration`);
		sleep(1);
		return;
	}

	// ── Module 1: Public endpoints (no auth needed) ───────────────────────
	healthCheck();
	pingCheck();
	apiVersion();

	// ── Module 2: Master Data ────────────────────────────────────────────
	listUsers(auth);
	listRoles(auth);
	listProducts(auth);
	listCustomers(auth);
	listSuppliers(auth);
	listWarehouses(auth);
	listCurrencies(auth);

	// ── Module 3: Core ────────────────────────────────────────────────────
	listPaymentTerms(auth);
	listBankAccounts(auth);
	listLeaveTypes(auth);
	listCourierAgencies(auth);
	listSOSources(auth);

	// ── Module 4: Organization ────────────────────────────────────────────
	listCompanies(auth);
	listBusinessUnits(auth);
	listDivisions(auth);
	listOutlets(auth);
	listAreas(auth);
	listOrgEmployees(auth);
	listJobPositions(auth);
	listBusinessTypes(auth);

	// ── Module 5: Sales ────────────────────────────────────────────────────
	listQuotations(auth);
	listOrders(auth);
	listDeliveryOrders(auth);
	listInvoices(auth);
	listPayments(auth);
	listSalesReturns(auth);
	listSalesTargets(auth);
	listSalesVisits(auth);
	listInvoiceDownPayments(auth);
	listReceivablesRecap(auth);

	// ── Module 6: Purchase ────────────────────────────────────────────────
	listPurchaseOrders(auth);
	listGoodsReceipts(auth);
	listPurchaseRequisitions(auth);
	listPurchaseReturns(auth);
	listPurchasePayments(auth);
	listSupplierInvoices(auth);
	listSupplierInvoiceDownPayments(auth);
	listPayableRecap(auth);

	// ── Module 7: Finance ──────────────────────────────────────────────────
	listChartOfAccounts(auth);
	listJournalEntries(auth);
	listBudgets(auth);
	listAssets(auth);
	listAssetCategories(auth);
	listAssetLocations(auth);
	listBankReconciliations(auth);
	listBankTransfers(auth);
	listCashBankJournals(auth);
	listCashBankTransactions(auth);
	listFinanceReports(auth);
	getFinanceSettings(auth);
	listFinancialClosings(auth);
	listFiscalYears(auth);
	getInventorySettings(auth);
	listJournalLines(auth);
	listNonTradePayables(auth);
	listOpeningBalances(auth);
	listFinancePayments(auth);
	listSystemAccountMappings(auth);
	listTaxConfigurations(auth);
	listTaxInvoices(auth);
	listUpCountryCosts(auth);
	listARAPReconciliations(auth);
	listDepreciation(auth);

	// ── Module 8: HRD ──────────────────────────────────────────────────────
	listAttendance(auth);
	listLeaveRequests(auth);
	listEmployees(auth);
	listWorkSchedules(auth);
	listHolidays(auth);
	listOvertimeRequests(auth);
	listEmployeeEvaluations(auth);
	listEvaluationCriteria(auth);
	listEvaluationGroups(auth);
	listRecruitmentRequests(auth);
	listRecruitmentApplicants(auth);
	listSalaryStructures(auth);

	// ── Module 9: Inventory ────────────────────────────────────────────────
	listStock(auth);
	getStockMetrics(auth);
	listMovements(auth);

	// ── Module 10: Product ─────────────────────────────────────────────────
	listProductCategories(auth);
	listProductBrands(auth);
	listProductSegments(auth);
	listProductTypes(auth);
	listUnitsOfMeasure(auth);
	listPackaging(auth);
	listProcurementTypes(auth);

	// ── Module 11: CRM ────────────────────────────────────────────────────────
	listLeads(auth);
	listDeals(auth);
	listContacts(auth);
	listActivities(auth);
	listActivityTypes(auth);
	listTasks(auth);
	listSchedules(auth);
	listVisitReports(auth);
	listPipelineStages(auth);
	listAreaMappings(auth);
	listLeadSources(auth);
	listLeadStatuses(auth);
	listContactRoles(auth);
	listLeadAutomations(auth);
	listAreaCaptures(auth);

	// ── Module 12: POS ────────────────────────────────────────────────────────
	listPOSOrders(auth);
	listPOSSessions(auth);
	listFloorPlans(auth);
	getPOSConfig(auth, data.outletId);

	// ── Module 13: Geographic ──────────────────────────────────────────────────
	listCountries(auth);
	listProvinces(auth);
	listCities(auth);
	listDistricts(auth);
	listVillages(auth);
	getMapData(auth);

	// ── Module 14: Report ──────────────────────────────────────────────────────
	getSalesOverview(auth);
	getProductAnalysis(auth);
	getGeoPerformance(auth);
	getCustomerResearch(auth);
	getSupplierResearch(auth);

	// ── Module 15: Stock Opname ────────────────────────────────────────────────
	listStockOpnames(auth);

	// ── Module 16: Supporting (Notification, Loyalty, General, Supplier) ────────
	listNotifications(auth);
	listLoyaltyPrograms(auth);
	listLoyaltyMembers(auth);
	getOnboardingStatus(auth);
	listSupplierTypes(auth);
	listSupplierBanks(auth);

	// ── Module 17: Misc (AI, Travel, Feedback) ─────────────────────────────────
	listAISessions(auth);
	listAIAdminActions(auth);
	listAIAdminIntents(auth);
	listTravelPlans(auth);
	listFeedbackForms(auth);

	// ── Module 18: Dashboard ────────────────────────────────────────────────
	dashboardOverview(auth);

	// ── E2E Workflows (every 5th iteration) ────────────────────────────────
	if (__ITER % 5 === 0) {
		const workflowData = {
			...data,
			productId: data.productId,
			customerId: data.customerId,
			warehouseId: data.warehouseId,
			supplierId: data.supplierId,
		};

		// Revenue cycle (most critical workflow)
		if (data.customerId !== "SETUP_MISSING") {
			revenueCycle(auth, workflowData, { withConcurrencyCheck: __ITER % 15 === 0 });
		}

		// Purchase cycle
		if (data.supplierId !== "SETUP_MISSING") {
			purchaseCycle(auth, workflowData);
		}

		// Journal entry
		if (data.coaDebitId !== "SETUP_MISSING") {
			journalEntryCycle(auth, workflowData);
		}

		// Attendance check-in
		if (data.employeeId !== "SETUP_MISSING") {
			attendanceCheckinCycle(auth, workflowData);
		}
	}

	// Brief sleep between iterations to simulate think time
	sleep(0.5 + Math.random() * 1.5);
}