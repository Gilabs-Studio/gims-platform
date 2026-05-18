// k6/scenarios/e2e/purchase-cycle.js
// Purchase Order → Goods Receipt end-to-end workflow.

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost } from "../../auth-helper.js";
import { parseBody, isoDate, addDays } from "../../lib/helpers.js";

const WORKFLOW_TAGS = { endpoint: "e2e:purchase-cycle", module: "purchase", tier: "workflow" };

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
		tags: { name: "purchase:orders:create", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const poId = parseBody(poRes)?.data?.id;
	check(poRes, { "PO created": (r) => r.status >= 200 && r.status < 300 && !!poId });
	if (!poId) return null;

	// STEP 2: Submit PO
	const poSubmit = authPost(`${API_V1}/purchase/purchase-orders/${poId}/submit`, {}, auth, {
		tags: { name: "purchase:orders:submit", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(poSubmit, { "PO submitted": (r) => r.status >= 200 && r.status < 300 });

	// STEP 3: Approve PO
	const poApprove = authPost(`${API_V1}/purchase/purchase-orders/${poId}/approve`, {}, auth, {
		tags: { name: "purchase:orders:approve", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(poApprove, { "PO approved": (r) => r.status >= 200 && r.status < 300 });

	// STEP 4: Create Goods Receipt
	if (poSubmit.status < 300 && poApprove.status < 300) {
		const grPayload = {
			purchase_order_id: poId,
			receipt_date: orderDate,
			items: [{ product_id: data.productId, quantity: 10, batch_id: data.batchId }],
		};
		const grRes = authPost(`${API_V1}/purchase/goods-receipt`, grPayload, auth, {
			tags: { name: "purchase:goods-receipt:create", ...WORKFLOW_TAGS },
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		const grId = parseBody(grRes)?.data?.id;
		check(grRes, { "GR created": (r) => r.status >= 200 && r.status < 300 && !!grId });

		// STEP 5: Confirm Goods Receipt
		if (grId) {
			const grConfirm = authPost(`${API_V1}/purchase/goods-receipt/${grId}/confirm`, {}, auth, {
				tags: { name: "purchase:goods-receipt:confirm", ...WORKFLOW_TAGS },
				responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
			});
			check(grConfirm, { "GR confirmed": (r) => r.status >= 200 && r.status < 300 });
		}

		return { poId, grId };
	}

	return { poId };
}