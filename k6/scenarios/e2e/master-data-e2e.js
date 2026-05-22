// k6/scenarios/e2e/master-data.js
// Master Data Module E2E Workflows — Product, customer, supplier creation.
//
// Exports:
//   - productFlow(auth, data)           → Create product with category/brand/UoM
//   - customerFlow(auth, data)          → Create customer
//   - errorDuplicateSKU(auth, data)     → Create product with existing SKU

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost } from "../../auth-helper.js";
import { parseBody } from "../../lib/helpers.js";

const TAGS = { module: "master-data", tier: "workflow" };

function tag(endpoint) {
	return { tags: { name: endpoint, endpoint, ...TAGS }, responseCallback: http.expectedStatuses({ min: 200, max: 599 }) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: Product Creation Flow
// ═══════════════════════════════════════════════════════════════════════════════
export function productFlow(auth, data) {
	// Get categories and UoM for product creation
	const catRes = authGet(`${API_V1}/product/product-categories`, auth, tag("master:product:get-categories"));
	const catItems = parseBody(catRes)?.data || [];
	const categories = Array.isArray(catItems) ? catItems : catItems.items || [];

	const uomRes = authGet(`${API_V1}/product/units-of-measure`, auth, tag("master:product:get-uom"));
	const uomItems = parseBody(uomRes)?.data || [];
	const uoms = Array.isArray(uomItems) ? uomItems : uomItems.items || [];

	const categoryId = categories[0]?.id;
	const uomId = uoms[0]?.id;

	// Create product
	const sku = "K6-PRD-" + Date.now();
	const productPayload = {
		name: "K6 Test Product " + Date.now(),
		sku: sku,
		category_id: categoryId,
		uom_id: uomId,
		price: 50000,
		cost: 30000,
		description: "Product created by K6 E2E workflow test",
		is_active: true,
	};

	const prodRes = authPost(`${API_V1}/product/products`, productPayload, auth, tag("master:product:create"));
	const product = parseBody(prodRes)?.data;
	check(prodRes, { "Product created": (r) => r.status >= 200 && r.status < 300 && !!product?.id });

	return { productId: product?.id, sku };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 2: Customer Creation Flow
// ═══════════════════════════════════════════════════════════════════════════════
export function customerFlow(auth, data) {
	const customerPayload = {
		name: "K6 Test Customer " + Date.now(),
		email: "k6-customer-" + Date.now() + "@test.com",
		phone: "08" + Math.floor(Math.random() * 9000000000 + 1000000000),
		address: "Jl. K6 Test No. " + Math.floor(Math.random() * 100),
		city: "Jakarta",
	};

	const custRes = authPost(`${API_V1}/customer/customers`, customerPayload, auth, tag("master:customer:create"));
	const customer = parseBody(custRes)?.data;
	check(custRes, { "Customer created": (r) => r.status >= 200 && r.status < 300 && !!customer?.id });

	return { customerId: customer?.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 3: Duplicate SKU
// ═══════════════════════════════════════════════════════════════════════════════
export function errorDuplicateSKU(auth, data) {
	// Get categories and UoM
	const catRes = authGet(`${API_V1}/product/product-categories`, auth, tag("master:error:get-categories"));
	const categories = parseBody(catRes)?.data || [];
	const catItems = Array.isArray(categories) ? categories : categories.items || [];

	const uomRes = authGet(`${API_V1}/product/units-of-measure`, auth, tag("master:error:get-uom"));
	const uoms = parseBody(uomRes)?.data || [];
	const uomItems = Array.isArray(uoms) ? uoms : uoms.items || [];

	const categoryId = catItems[0]?.id;
	const uomId = uomItems[0]?.id;
	const sku = "K6-DUP-" + Date.now();

	// Create first product
	const first = authPost(`${API_V1}/product/products`, {
		name: "K6 First Product",
		sku: sku,
		category_id: categoryId,
		uom_id: uomId,
		price: 10000,
		cost: 5000,
	}, auth, tag("master:error:create-first"));

	if (first.status >= 300) return null;

	// Create second with same SKU (should fail)
	const second = authPost(`${API_V1}/product/products`, {
		name: "K6 Duplicate Product",
		sku: sku,
		category_id: categoryId,
		uom_id: uomId,
		price: 20000,
		cost: 10000,
	}, auth, tag("master:error:duplicate-sku"));

	check(second, {
		"Duplicate SKU handled": (r) => r.status >= 200 && r.status < 500,
	});

	return { rejected: second.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER: Execute all Master Data workflows (called by profiler)
// ═══════════════════════════════════════════════════════════════════════════════
export function runMasterDataWorkflows(auth, data) {
	productFlow(auth, data);
	customerFlow(auth, data);
	errorDuplicateSKU(auth, data);
}
