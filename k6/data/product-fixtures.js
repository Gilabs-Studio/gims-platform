// k6/data/product-fixtures.js
// Test data fixtures for GIMS k6 tests.
// Using SharedArray so data is shared across all VUs (memory-efficient).

import { SharedArray } from "k6/data";

export const productNames = new SharedArray("product-names", () => [
	"Benchmark Widget Alpha",
	"Benchmark Widget Beta",
	"Load Test Component X",
	"Load Test Component Y",
	"Load Test Component Z",
	"Perf Test Item Series 1",
	"Perf Test Item Series 2",
	"Perf Test Item Series 3",
	"Smoke Test Product A",
	"Smoke Test Product B",
	"Stress Test Item",
]);

/**
 * Generate a unique product code for CREATE operations.
 */
export function generateProductCode(prefix = "K6") {
	return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Generate a unique product name for CREATE operations.
 */
export function generateProductName(index = 0) {
	const name = productNames[index % productNames.length];
	return `${name} ${Date.now()}-${index}`;
}