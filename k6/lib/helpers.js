// k6/lib/helpers.js
// Shared utility functions for transaction workflow scenarios.
// Ported from the legacy transaction-test.js to be reusable.

import http from "k6/http";
import { authGet, authPost } from "../auth-helper.js";

/**
 * Parse JSON response body, returning null on failure.
 */
export function parseBody(res) {
	try {
		return res.json();
	} catch (_) {
		return null;
	}
}

/**
 * Get the first item from a list response.
 * Handles both { data: [...] } and { data: { items: [...] } } envelopes.
 */
export function firstItem(res) {
	const body = parseBody(res);
	if (!body || !body.data) return null;
	if (Array.isArray(body.data)) return body.data[0] || null;
	if (Array.isArray(body.data.items)) return body.data.items[0] || null;
	return null;
}

/**
 * Extract field errors from a GIMS 422 response.
 * Returns a human-readable string like "field1:message1, field2:message2".
 */
export function extractFieldErrors(res) {
	const body = parseBody(res);
	const errs = body?.error?.field_errors;
	if (!Array.isArray(errs)) return "";
	return errs.map((e) => `${e.field}:${e.message}`).join(", ");
}

/**
 * Generate ISO date string (YYYY-MM-DD).
 * Uses apptime.Now() in production; defaults to UTC for tests.
 */
export function isoDate(date = new Date()) {
	return date.toISOString().split("T")[0];
}

/**
 * Add days to a date and return ISO date string.
 */
export function addDays(date, days) {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

/**
 * Pick a random element from an array.
 */
export function randomPick(arr) {
	if (!arr || arr.length === 0) return null;
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Require a value or throw an error (used in setup).
 */
export function requiredId(name, value) {
	if (!value) throw new Error(`setup failed: missing ${name}`);
	return value;
}

/**
 * Select inventory batches for a delivery order item.
 * Calls the backend's batch selection endpoint to find available batches.
 *
 * @param {object} auth - Auth token object from getAuthToken()
 * @param {string} warehouseId - Warehouse UUID
 * @param {string} productId - Product UUID
 * @param {number} quantity - Required quantity
 * @param {string} apiV1 - API base path (e.g. "/api/v1")
 * @returns {string|null} Batch ID or null if no batch available
 */
export function pickBatchId(auth, warehouseId, productId, quantity, apiV1) {
	const res = authPost(
		`${apiV1}/sales/delivery-orders/select-batches`,
		{
			product_id: productId,
			warehouse_id: warehouseId,
			quantity,
			method: "FIFO",
		},
		auth,
		{
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		},
	);

	if (res.status < 200 || res.status >= 300) return null;

	const body = parseBody(res);
	const batches = body?.data?.batches;
	if (!Array.isArray(batches) || batches.length === 0) return null;

	for (const batch of batches) {
		if (Number(batch.available || batch.current_quantity || 0) >= quantity) {
			return batch.id || null;
		}
	}
	return null;
}

/**
 * Collect products that have available inventory batches in a warehouse.
 * Used in setup() to pre-identify products that can be delivered.
 *
 * @param {object} auth - Auth token object from getAuthToken()
 * @param {string} warehouseId - Warehouse UUID
 * @param {string} apiV1 - API base path
 * @param {number} limit - Max products to collect
 * @returns {Array} Array of { productId, batchId } objects
 */
export function collectBatchableProducts(auth, warehouseId, apiV1, limit = 8) {
	const res = authGet(`${apiV1}/product/products?per_page=100`, auth);
	const body = parseBody(res);
	const products = Array.isArray(body?.data)
		? body.data
		: Array.isArray(body?.data?.items)
			? body.data.items
			: [];

	const batchable = [];
	for (const product of products) {
		if (!product?.id) continue;
		const batchId = pickBatchId(auth, warehouseId, product.id, 1, apiV1);
		if (!batchId) continue;
		batchable.push({ productId: product.id, batchId });
		if (batchable.length >= limit) break;
	}
	return batchable;
}

/**
 * Find a single batchable product (for fast setup in low-VU scenarios).
 */
export function findBatchableProduct(auth, warehouseId, apiV1) {
	const res = authGet(`${apiV1}/product/products?per_page=20`, auth);
	const body = parseBody(res);
	const items = Array.isArray(body?.data)
		? body.data
		: Array.isArray(body?.data?.items)
			? body.data.items
			: [];

	for (const p of items) {
		const productId = p?.id;
		if (!productId) continue;
		const batchId = pickBatchId(auth, warehouseId, productId, 1, apiV1);
		if (batchId) return { productId, batchId };
	}
	return null;
}