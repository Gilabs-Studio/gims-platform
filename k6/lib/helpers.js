// k6/lib/helpers.js
// Shared utility functions for transaction workflow scenarios.

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
 */
export function isoDate(date = new Date()) {
	return date.toISOString().split("T")[0];
}

/**
 * Add N days to a date, return ISO string.
 */
export function addDays(date, days) {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

/**
 * Extract required ID from a response; fail test if missing.
 */
export function requiredId(res, label = "resource") {
	const body = parseBody(res);
	const id = body?.data?.id;
	if (!id) {
		console.error(`Required ID missing for ${label}: status=${res.status}`);
	}
	return id;
}

/**
 * Pick a batch ID from a list response (for delivery/receipt workflows).
 */
export function pickBatchId(res) {
	const item = firstItem(res);
	if (!item) return null;
	// Try common batch ID fields
	return item.batch_id || item.id || null;
}

/**
 * Collect products that have available stock (batchable).
 */
export function collectBatchableProducts(listRes) {
	const body = parseBody(listRes);
	if (!body || !body.data) return [];
	const items = Array.isArray(body.data) ? body.data : body.data.items || [];
	return items.filter((p) => p.stock_quantity > 0 || p.available_quantity > 0);
}

/**
 * Pick a workflow target from setup data (product with stock).
 */
export function pickWorkflowTarget(data) {
	if (!data || !data.batchableProducts || data.batchableProducts.length === 0) return null;
	// Pick a random product from batchable products
	return data.batchableProducts[Math.floor(Math.random() * data.batchableProducts.length)];
}

/**
 * Sleep for a random duration between min and max seconds.
 */
export function randomSleep(min = 0.5, max = 2) {
	const duration = min + Math.random() * (max - min);
	return duration;
}