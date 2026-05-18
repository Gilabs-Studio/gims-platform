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
import { listQuotations, createQuotation, listOrders, listDeliveryOrders, listInvoices, listPayments } from "../scenarios/apis/sales.js";
import { listPurchaseOrders, listGoodsReceipts } from "../scenarios/apis/purchase.js";
import { listChartOfAccounts, listJournalEntries, listBudgets } from "../scenarios/apis/finance.js";
import { listAttendance, listLeaveRequests, listEmployees } from "../scenarios/apis/hrd.js";
import { listStock, getStockMetrics, listMovements } from "../scenarios/apis/inventory.js";
import { listUsers, listRoles, listProducts, createProduct, listCustomers, listSuppliers, listWarehouses, listCurrencies } from "../scenarios/apis/master-data.js";
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

		// Chart of accounts (for journal entries)
		const coaRes = listChartOfAccounts(auth);
		const coaData = parseBody(coaRes);
		if (coaData?.data) {
			const items = Array.isArray(coaData.data) ? coaData.data : coaData.data.items || [];
			if (items.length >= 2) {
				coaDebitId = items[0]?.id;
				coaCreditId = items[1]?.id;
			}
		}

		// Employees
		const empRes = listEmployees(auth);
		const empData = parseBody(empRes);
		if (empData?.data) {
			const items = Array.isArray(empData.data) ? empData.data : empData.data.items || [];
			employeeId = items[0]?.id;
		}

		// Parse first user for company/business unit IDs
		const meRes = authGet(`${API_V1}/users/me`, auth, { tags: { name: "auth:me", endpoint: "auth:me", module: "auth", tier: "crud" } });
		const meData = parseBody(meRes);
		if (meData?.data) {
			companyId = meData.data.company_id || meData.data.companyId;
			businessUnitId = meData.data.business_unit_id || meData.data.businessUnitId;
			salesRepId = meData.data.employee_id || meData.data.id;
		}
	} catch (e) {
		console.error(`Profiler setup error (continuing): ${e.message}`);
	}

	// Use sensible defaults for IDs that weren't found in setup
	if (batchableProducts.length === 0 && productId) {
		batchableProducts = [{ productId }];
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

	// ── Module 3: Sales ────────────────────────────────────────────────────
	listQuotations(auth);
	listOrders(auth);
	listDeliveryOrders(auth);
	listInvoices(auth);
	listPayments(auth);

	// ── Module 4: Purchase ────────────────────────────────────────────────
	listPurchaseOrders(auth);
	listGoodsReceipts(auth);

	// ── Module 5: Finance ──────────────────────────────────────────────────
	listChartOfAccounts(auth);
	listJournalEntries(auth);
	listBudgets(auth);

	// ── Module 6: HRD ──────────────────────────────────────────────────────
	listAttendance(auth);
	listLeaveRequests(auth);
	listEmployees(auth);

	// ── Module 7: Inventory ────────────────────────────────────────────────
	listStock(auth);
	getStockMetrics(auth);
	listMovements(auth);

	// ── Module 8: Dashboard ────────────────────────────────────────────────
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