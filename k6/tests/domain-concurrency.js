// k6/tests/domain-concurrency.js
// Domain-concurrency profile — validates business invariants under concurrent traffic.
// Tests HRD attendance, finance posting, and POS payment contention.
//
// Usage:
//   k6 run k6/tests/domain-concurrency.js
//   k6 run -e VUS=30 -e K6_ENV=staging k6/tests/domain-concurrency.js

import { sleep } from "k6";
import { envGuard } from "../lib/env-guard.js";
import { getProfileOptions } from "../lib/thresholds.js";
import { testData } from "../lib/test-data.js";
import { API_V1, CREDENTIALS } from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";
import { getCredentialForVU } from "../data/multi-tenant-credentials.js";
import { parseBody, firstItem } from "../lib/helpers.js";

// Concurrency scenario imports
import { attendanceRush } from "../scenarios/concurrency/hrd-attendance.js";
import { financePostingContention } from "../scenarios/concurrency/finance-posting.js";
import { posBurstSimulation } from "../scenarios/concurrency/pos-payment.js";
import { inventoryConcurrency } from "../scenarios/concurrency/inventory-stock.js";
import { salesWorkflowConcurrency } from "../scenarios/concurrency/sales-workflow.js";
import { purchaseWorkflowConcurrency } from "../scenarios/concurrency/purchase-workflow.js";

// API imports for setup
import {
	listProducts,
	listCustomers,
	listSuppliers,
	listWarehouses,
} from "../scenarios/apis/master-data.js";
import { listChartOfAccounts } from "../scenarios/apis/finance.js";
import { listEmployees } from "../scenarios/apis/hrd.js";
import { listCompanies, listOutlets } from "../scenarios/apis/organization.js";
import { listPaymentTerms } from "../scenarios/apis/core.js";

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = getProfileOptions("domain-concurrency");

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
	envGuard.printBanner("domain-concurrency");

	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		throw new Error("[domain-concurrency] Authentication failed.");
	}

	let companyId = null,
		productId = null,
		customerId = null,
		warehouseId = null,
		supplierId = null;
	let coaDebitId = null,
		coaCreditId = null,
		employeeId = null;
	let outletId = null,
		officeLatitude = -6.2088,
		officeLongitude = 106.8456;
	let paymentTermsId = null;

	try {
		const companiesRes = listCompanies(auth);
		companyId = firstItem(companiesRes)?.id;

		const productsRes = listProducts(auth);
		productId = firstItem(productsRes)?.id;

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

		const paymentTermsRes = listPaymentTerms(auth);
		paymentTermsId = firstItem(paymentTermsRes)?.id;

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
		console.warn(`[domain-concurrency] Setup warning: ${e.message}`);
	}

	const setupData = {
		auth,
		companyId: companyId || "SETUP_MISSING",
		productId: productId || "SETUP_MISSING",
		customerId: customerId || "SETUP_MISSING",
		warehouseId: warehouseId || "SETUP_MISSING",
		supplierId: supplierId || "SETUP_MISSING",
		paymentTermsId: paymentTermsId || "SETUP_MISSING",
		coaDebitId: coaDebitId || "SETUP_MISSING",
		coaCreditId: coaCreditId || "SETUP_MISSING",
		employeeId: employeeId || "SETUP_MISSING",
		outletId: outletId || "SETUP_MISSING",
		officeLatitude,
		officeLongitude,
	};

	// Fail fast if critical concurrency data is missing
	testData.load(setupData);
	testData.requireForProfile("domain-concurrency");

	return setupData;
}

// ── Domain Concurrency Execution ─────────────────────────────────────────────

export default function (data) {
	const vuCreds = getCredentialForVU(__VU);
	const auth = getAuthToken(vuCreds) || data.auth;

	if (!auth) {
		sleep(1);
		return;
	}

	// Rotate through concurrency scenarios based on VU number
	const scenario = __VU % 6;

	switch (scenario) {
		case 0:
			// HRD Attendance Rush
			attendanceRush(auth, data);
			break;

		case 1:
			// Finance Posting Contention
			financePostingContention(auth, data);
			break;

		case 2:
			// POS Order/Payment Burst
			posBurstSimulation(auth, data);
			break;

		case 3:
			// Inventory Stock Concurrency
			inventoryConcurrency(auth, data);
			break;

		case 4:
			// Sales Workflow Concurrency
			salesWorkflowConcurrency(auth, data);
			break;

		case 5:
			// Purchase Workflow Concurrency
			purchaseWorkflowConcurrency(auth, data);
			break;
	}

	sleep(0.3 + Math.random() * 0.7);
}
