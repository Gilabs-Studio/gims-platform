// k6/tests/load.js
// Load profile — primary release gate with strict tiered thresholds.
// Validates that core API latency stays within SLOs under sustained traffic.
//
// What it tests:
//   - All major module list endpoints under concurrent load
//   - E2E workflows (revenue cycle, purchase cycle, journal entry, attendance)
//   - Tiered latency: crud < list < report < workflow
//   - Error rate < 1%
//
// Usage:
//   k6 run k6/tests/load.js
//   k6 run -e VUS=30 -e K6_ENV=staging k6/tests/load.js

import { check, sleep } from "k6";
import { envGuard } from "../lib/env-guard.js";
import { getProfileOptions } from "../lib/thresholds.js";
import { testData } from "../lib/test-data.js";
import { API_V1, CREDENTIALS } from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";
import { getCredentialForVU } from "../data/multi-tenant-credentials.js";
import { parseBody, firstItem } from "../lib/helpers.js";
import { ErrorHandler } from "../lib/error-handler.js";

// API scenario imports
import {
	listProducts,
	listCustomers,
	listSuppliers,
	listWarehouses,
} from "../scenarios/apis/master-data.js";
import {
	listQuotations,
	listOrders,
	listDeliveryOrders,
	listInvoices,
} from "../scenarios/apis/sales.js";
import {
	listPurchaseOrders,
	listGoodsReceipts,
} from "../scenarios/apis/purchase.js";
import {
	listChartOfAccounts,
	listJournalEntries,
} from "../scenarios/apis/finance.js";
import {
	listAttendance,
	listLeaveRequests,
	listEmployees,
} from "../scenarios/apis/hrd.js";
import { listStock, listMovements } from "../scenarios/apis/inventory.js";
import { listPOSOrders, listPOSSessions } from "../scenarios/apis/pos.js";
import {
	listCompanies,
	listBusinessUnits,
	listOutlets,
} from "../scenarios/apis/organization.js";
import { listPaymentTerms, listBankAccounts } from "../scenarios/apis/core.js";

// E2E workflow imports
import { revenueCycle } from "../scenarios/e2e/revenue-cycle.js";
import { purchaseCycle } from "../scenarios/e2e/purchase-cycle.js";
import { journalEntryCycle } from "../scenarios/e2e/journal-entry.js";
import { attendanceCheckinCycle } from "../scenarios/e2e/attendance-checkin.js";
import { dashboardOverview } from "../scenarios/e2e/dashboard-overview.js";

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = getProfileOptions("load");

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
	envGuard.printBanner("load");

	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		throw new Error(
			"[load] Authentication failed in setup. Backend may be down.",
		);
	}

	// Resolve prerequisite IDs (same pattern as endpoint-profiler)
	let customerId = null,
		productId = null,
		warehouseId = null,
		supplierId = null;
	let paymentTermsId = null,
		salesRepId = null,
		businessUnitId = null,
		bankAccountId = null;
	let companyId = null,
		coaDebitId = null,
		coaCreditId = null;
	let employeeId = null,
		leaveTypeId = null,
		outletId = null;
	let officeLatitude = -6.2088,
		officeLongitude = 106.8456;
	let batchableProducts = [];

	try {
		const productsRes = listProducts(auth);
		const productData = parseBody(productsRes);
		if (productData?.data) {
			const items = Array.isArray(productData.data)
				? productData.data
				: productData.data.items || [];
			productId = items[0]?.id;
			batchableProducts = items
				.filter((p) => p.stock_quantity > 0 || p.available_quantity > 0)
				.map((p) => ({ productId: p.id }));
		}

		const customersRes = listCustomers(auth);
		customerId = firstItem(customersRes)?.id;

		const warehousesRes = listWarehouses(auth);
		warehouseId = firstItem(warehousesRes)?.id;

		const suppliersRes = listSuppliers(auth);
		supplierId = firstItem(suppliersRes)?.id;

		const coaRes = listChartOfAccounts(auth);
		const coaData = parseBody(coaRes);
		if (coaData?.data) {
			const items = Array.isArray(coaData.data)
				? coaData.data
				: coaData.data.items || [];
			const safeAccounts = items.filter((a) => {
				const type = (a.type || "").toUpperCase();
				return (
					(type === "EXPENSE" || type === "REVENUE" || type === "EQUITY") &&
					a.is_postable !== false
				);
			});
			const usable = safeAccounts.length >= 2 ? safeAccounts : items;
			if (usable.length >= 2) {
				coaDebitId = usable[0]?.id;
				coaCreditId = usable[1]?.id;
			}
		}

		const empRes = listEmployees(auth);
		employeeId = firstItem(empRes)?.id;

		// GIMS has no /users/me — identity comes from the login response.
		const user = auth.user || {};
		salesRepId = user.employee_id || user.id || null;
		// company_id is not in the user object; resolve from organization endpoint.
		const compRes = listCompanies(auth);
		companyId = firstItem(compRes)?.id;
		const buRes = listBusinessUnits(auth);
		businessUnitId = firstItem(buRes)?.id;

		const paymentTermsRes = listPaymentTerms(auth);
		paymentTermsId = firstItem(paymentTermsRes)?.id;

		const bankAccountsRes = listBankAccounts(auth);
		bankAccountId = firstItem(bankAccountsRes)?.id;

		const businessUnitsRes = listBusinessUnits(auth);
		businessUnitId = businessUnitId || firstItem(businessUnitsRes)?.id;

		const outletRes = listOutlets(auth);
		const outletItem = firstItem(outletRes);
		if (outletItem) {
			outletId = outletItem.id;
			if (outletItem.latitude && outletItem.longitude) {
				officeLatitude = outletItem.latitude;
				officeLongitude = outletItem.longitude;
			}
		}
	} catch (e) {
		console.warn(`[load] Setup warning: ${e.message}`);
	}

	if (batchableProducts.length === 0 && productId) {
		batchableProducts = [{ productId }];
	}

	const setupData = {
		auth,
		companyId: companyId || "SETUP_MISSING",
		productId: productId || "SETUP_MISSING",
		customerId: customerId || "SETUP_MISSING",
		warehouseId: warehouseId || "SETUP_MISSING",
		supplierId: supplierId || "SETUP_MISSING",
		paymentTermsId: paymentTermsId || "SETUP_MISSING",
		salesRepId: salesRepId || "SETUP_MISSING",
		businessUnitId: businessUnitId || "SETUP_MISSING",
		bankAccountId: bankAccountId || "SETUP_MISSING",
		coaDebitId: coaDebitId || "SETUP_MISSING",
		coaCreditId: coaCreditId || "SETUP_MISSING",
		employeeId: employeeId || "SETUP_MISSING",
		leaveTypeId: leaveTypeId || null,
		outletId: outletId || "SETUP_MISSING",
		officeLatitude,
		officeLongitude,
		batchableProducts,
	};

	// Fail fast if critical data is missing
	testData.load(setupData);
	testData.requireForProfile("load");

	return setupData;
}

// ── Load Test Execution ──────────────────────────────────────────────────────

const eh = new ErrorHandler({ logDetails: false });

export default function (data) {
	// Multi-tenant: each VU uses different credentials
	const vuCreds = getCredentialForVU(__VU);
	const auth = getAuthToken(vuCreds) || data.auth;

	if (!auth) {
		console.error(`[load] VU ${__VU}: No auth token, skipping iteration`);
		sleep(1);
		return;
	}

	// ── Core list endpoints (every iteration) ──────────────────────────────
	listProducts(auth);
	listCustomers(auth);
	listSuppliers(auth);
	listWarehouses(auth);
	listQuotations(auth);
	listOrders(auth);
	listPurchaseOrders(auth);
	listChartOfAccounts(auth);
	listJournalEntries(auth);
	listAttendance(auth);
	listStock(auth);
	listPOSOrders(auth);
	listCompanies(auth);

	// Dashboard
	dashboardOverview(auth);

	// ── E2E Workflows (every 3rd iteration) ────────────────────────────────
	if (__ITER % 3 === 0) {
		// These will run because testData.requireForProfile('load') already validated
		// that product, customer, warehouse are present in setup.
		revenueCycle(auth, data, { withConcurrencyCheck: false });
		purchaseCycle(auth, data);

		if (data.coaDebitId !== "SETUP_MISSING") {
			journalEntryCycle(auth, data);
		}

		if (data.employeeId !== "SETUP_MISSING") {
			attendanceCheckinCycle(auth, data);
		}
	}

	// Think time
	sleep(0.5 + Math.random() * 1.5);
}
