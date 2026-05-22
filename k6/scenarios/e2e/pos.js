// k6/scenarios/e2e/pos.js
// POS Module E2E Workflows — Session management, order flow, payment.
//
// Exports:
//   - posSessionFlow(auth, data)     → Open session → create order → payment → close session
//   - posOrderFlow(auth, data)       → Create order → add items → confirm → cash payment
//   - errorOrderOnClosedSession(auth, data) → Create order without active session

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost } from "../../auth-helper.js";
import { parseBody } from "../../lib/helpers.js";

const TAGS = { module: "pos", tier: "workflow" };

function tag(endpoint) {
	return { tags: { name: endpoint, endpoint, ...TAGS }, responseCallback: http.expectedStatuses({ min: 200, max: 599 }) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: POS Session Flow (open → order → payment → close)
// ═══════════════════════════════════════════════════════════════════════════════
export function posSessionFlow(auth, data) {
	if (data.outletId === "SETUP_MISSING") return null;

	// Step 1: Open session
	const openRes = authPost(`${API_V1}/pos/sessions/open`, {
		outlet_id: data.outletId,
		warehouse_id: data.warehouseId,
		opening_cash: 500000,
	}, auth, tag("pos:session:open"));
	const session = parseBody(openRes)?.data;
	check(openRes, { "POS session opened": (r) => r.status >= 200 && r.status < 300 && !!session?.id });
	if (!session?.id) return null;

	// Step 2: Create order
	const orderRes = authPost(`${API_V1}/pos/orders`, {
		outlet_id: data.outletId,
		order_type: "DINE_IN",
		guest_count: 2,
	}, auth, tag("pos:order:create"));
	const order = parseBody(orderRes)?.data;
	check(orderRes, { "POS order created": (r) => r.status >= 200 && r.status < 300 && !!order?.id });

	// Step 3: Add item to order
	if (order?.id && data.productId !== "SETUP_MISSING") {
		const addItemRes = authPost(`${API_V1}/pos/orders/${order.id}/items`, {
			product_id: data.productId,
			quantity: 2,
			notes: "K6 test item",
		}, auth, tag("pos:order:add-item"));
		check(addItemRes, { "POS item added": (r) => r.status >= 200 && r.status < 300 });

		// Step 4: Confirm order
		const confirmRes = authPost(`${API_V1}/pos/orders/${order.id}/confirm`, {}, auth, tag("pos:order:confirm"));
		check(confirmRes, { "POS order confirmed": (r) => r.status >= 200 && r.status < 300 });

		// Step 5: Process cash payment
		if (confirmRes.status < 300) {
			const payRes = authPost(`${API_V1}/pos/orders/${order.id}/payments/cash`, {
				method: "CASH",
				amount: 100000,
			}, auth, tag("pos:payment:cash"));
			check(payRes, { "POS payment processed": (r) => r.status >= 200 && r.status < 300 });
		}
	}

	// Step 6: Close session
	const closeRes = authPost(`${API_V1}/pos/sessions/${session.id}/close`, {
		closing_cash: 600000,
	}, auth, tag("pos:session:close"));
	check(closeRes, { "POS session closed": (r) => r.status >= 200 && r.status < 300 });

	return { sessionId: session.id, orderId: order?.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 2: POS Order Flow (standalone order without session management)
// ═══════════════════════════════════════════════════════════════════════════════
export function posOrderFlow(auth, data) {
	if (data.outletId === "SETUP_MISSING") return null;

	// Create takeaway order
	const orderRes = authPost(`${API_V1}/pos/orders`, {
		outlet_id: data.outletId,
		order_type: "TAKEAWAY",
		customer_name: "K6 Walk-in Customer",
		guest_count: 1,
	}, auth, tag("pos:order:create-takeaway"));
	const order = parseBody(orderRes)?.data;
	check(orderRes, { "POS takeaway order created": (r) => r.status >= 200 && r.status < 300 && !!order?.id });
	if (!order?.id) return null;

	// Add item
	if (data.productId !== "SETUP_MISSING") {
		authPost(`${API_V1}/pos/orders/${order.id}/items`, {
			product_id: data.productId,
			quantity: 1,
		}, auth, tag("pos:order:add-item-takeaway"));

		// Confirm
		const confirmRes = authPost(`${API_V1}/pos/orders/${order.id}/confirm`, {}, auth, tag("pos:order:confirm-takeaway"));
		check(confirmRes, { "POS takeaway confirmed": (r) => r.status >= 200 && r.status < 300 });

		// Pay with cash
		if (confirmRes.status < 300) {
			const payRes = authPost(`${API_V1}/pos/orders/${order.id}/payments/cash`, {
				method: "CASH",
				amount: 50000,
			}, auth, tag("pos:payment:cash-takeaway"));
			check(payRes, { "POS takeaway paid": (r) => r.status >= 200 && r.status < 300 });
		}
	}

	return { orderId: order.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 3: Void order
// ═══════════════════════════════════════════════════════════════════════════════
export function errorVoidOrder(auth, data) {
	if (data.outletId === "SETUP_MISSING") return null;

	// Create order
	const orderRes = authPost(`${API_V1}/pos/orders`, {
		outlet_id: data.outletId,
		order_type: "DINE_IN",
		guest_count: 1,
	}, auth, tag("pos:error:create"));
	const orderId = parseBody(orderRes)?.data?.id;
	if (!orderId) return null;

	// Void the order
	const voidRes = authPost(`${API_V1}/pos/orders/${orderId}/void`, {
		reason: "K6 test - customer cancelled",
	}, auth, tag("pos:error:void"));
	check(voidRes, { "POS order voided": (r) => r.status >= 200 && r.status < 300 });

	return { orderId, voided: voidRes.status < 300 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER: Execute all POS workflows (called by profiler)
// ═══════════════════════════════════════════════════════════════════════════════
export function runPOSWorkflows(auth, data) {
	if (data.outletId === "SETUP_MISSING") return;

	posSessionFlow(auth, data);
	posOrderFlow(auth, data);
	errorVoidOrder(auth, data);
}
