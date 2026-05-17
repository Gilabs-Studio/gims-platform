// k6/scenarios/e2e/purchase-cycle.js
// Purchase Order → Goods Receipt end-to-end workflow.
//
// Correct GIMS API paths:
//   POST   /purchase/purchase-orders              → Create PO
//   POST   /purchase/purchase-orders/:id/submit    → Submit PO
//   POST   /purchase/purchase-orders/:id/approve   → Approve PO
//   POST   /purchase/goods-receipt                  → Create GR
//   POST   /purchase/goods-receipt/:id/confirm     → Confirm GR

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost, authPatch } from "../../auth-helper.js";
import { parseBody, isoDate, addDays, firstItem, requiredId } from "../../lib/helpers.js";

export function purchaseCycle(auth, data) {
	const now = new Date();
	const orderDate = isoDate(now);
	const expectedDate = isoDate(addDays(now, 14));

	// STEP 1: Create Purchase Order
	const poPayload = {
		order_date: orderDate,
		expected_delivery_date: expectedDate,
		supplier_id: data.supplierId,
		warehouse_id: data.warehouseId,
		payment_terms_id: data.paymentTermsId,
		items: [{
			product_id: data.productId,
			quantity: 10,
			price: 25000,
			discount: 0,
			tax_rate: 11,
		}],
	};

	const poRes = authPost(`${API_V1}/purchase/purchase-orders`, poPayload, auth, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const poId = parseBody(poRes)?.data?.id;
	check(poRes, { "PO created": (r) => r.status >= 200 && r.status < 300 && !!poId });
	if (!poId) {
		console.error(`PO create failed: ${poRes.status} body=${poRes.body?.substring(0, 300)}`);
		return null;
	}

	// STEP 2: PO status transitions: submit → approve (action endpoints, NOT patch status)
	const poSubmitted = authPost(`${API_V1}/purchase/purchase-orders/${poId}/submit`, {}, auth, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(poSubmitted, { "PO submitted": (r) => r.status >= 200 && r.status < 300 });

	const poApproved = authPost(`${API_V1}/purchase/purchase-orders/${poId}/approve`, {}, auth, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(poApproved, { "PO approved": (r) => r.status >= 200 && r.status < 300 });

	if (poSubmitted.status >= 300 || poApproved.status >= 300) {
		console.error(`PO approval failed: submitted=${poSubmitted.status} approved=${poApproved.status}`);
		return { poId, grId: null };
	}

	// STEP 3: Create Goods Receipt (singular "goods-receipt", not plural)
	const poGet = authGet(`${API_V1}/purchase/purchase-orders/${poId}`, auth);
	const poItems = parseBody(poGet)?.data?.items || [];

	const grItems = poItems.map((item) => ({
		purchase_order_item_id: item.id,
		product_id: item.product_id,
		warehouse_id: data.warehouseId,
		quantity_received: item.quantity || 10,
		batch_number: `K6-GR-${Date.now()}`,
		manufacture_date: orderDate,
		expiry_date: isoDate(addDays(now, 365)),
	}));

	const grPayload = {
		receipt_date: orderDate,
		purchase_order_id: poId,
		warehouse_id: data.warehouseId,
		items: grItems,
	};

	const grRes = authPost(`${API_V1}/purchase/goods-receipt`, grPayload, auth, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const grId = parseBody(grRes)?.data?.id;
	check(grRes, { "GR created": (r) => r.status >= 200 && r.status < 300 && !!grId });
	if (!grId) {
		console.error(`GR create failed: ${grRes.status} body=${grRes.body?.substring(0, 300)}`);
	}

	// STEP 4: Confirm Goods Receipt
	if (grId) {
		const grConfirm = authPost(`${API_V1}/purchase/goods-receipt/${grId}/confirm`, {}, auth, {
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		check(grConfirm, { "GR confirmed": (r) => r.status >= 200 && r.status < 300 });
	}

	return { poId, grId };
}

export function purchaseCycleSetup(auth) {
	const supplier = firstItem(authGet(`${API_V1}/supplier/suppliers?per_page=1`, auth));
	const warehouse = firstItem(authGet(`${API_V1}/warehouse/warehouses?per_page=1`, auth));
	const product = firstItem(authGet(`${API_V1}/product/products?per_page=1`, auth));
	const paymentTerms = firstItem(authGet(`${API_V1}/master-data/payment-terms?per_page=1`, auth));

	return {
		auth,
		supplierId: requiredId("supplierId", supplier?.id),
		warehouseId: requiredId("warehouseId", warehouse?.id),
		productId: requiredId("productId", product?.id),
		paymentTermsId: requiredId("paymentTermsId", paymentTerms?.id),
	};
}