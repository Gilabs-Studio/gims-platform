// k6/lib/metrics.js
// Custom business KPI metrics for GIMS ERP.

import { Trend, Counter, Rate } from "k6/metrics";

// ── Business KPI Metrics ───────────────────────────────────────────────────

/** End-to-end workflow latency (SQ → SO → DO → Invoice) */
export const workflowLatency = new Trend("gims_workflow_duration_ms");

/** Invoice creation success rate */
export const invoiceSuccessRate = new Rate("gims_invoice_success_rate");

/** Payment processing success rate */
export const paymentSuccessRate = new Rate("gims_payment_success_rate");

/** Sales order conversion rate (SQ → SO) */
export const soConversionRate = new Rate("gims_so_conversion_rate");

/** Delivery order fulfillment rate */
export const doFulfillmentRate = new Rate("gims_do_fulfillment_rate");

/** Per-module request latency */
export const moduleLatency = new Trend("gims_module_latency_ms");

/** Concurrent mutation conflict detection rate */
export const conflictRate = new Rate("gims_conflict_rate");

/** Rate limit hit counter */
export const rateLimitHits = new Counter("gims_rate_limit_hits");

/** Multi-tenant isolation violation counter */
export const tenantIsolationViolations = new Counter("gims_tenant_isolation_violations");

// ── Profiler Metrics ────────────────────────────────────────────────────────

/** Per-endpoint latency (tagged with {endpoint, module, tier}) */
export const endpointLatency = new Trend("gims_endpoint_latency_ms");

// ── Metric Helpers ──────────────────────────────────────────────────────────

export function recordWorkflowDuration(workflow, durationMs) {
	workflowLatency.add(durationMs, { workflow });
}

export function recordModuleLatency(module, durationMs) {
	moduleLatency.add(durationMs, { module });
}

export function recordEndpointLatency(endpoint, module, tier, durationMs) {
	endpointLatency.add(durationMs, { endpoint, module, tier });
}