// k6/lib/error-handler.js
// Centralized error handling for GIMS k6 tests.
// At high load, failures number in the thousands — aggregate, don't log everything.

import { check } from "k6";
import { Counter } from "k6/metrics";

/**
 * Custom metric: count errors per endpoint and status code.
 * Tags: { endpoint, status, error_type }
 */
export const errorCounter = new Counter("gims_errors");

/**
 * Custom metric: count field validation errors.
 * Tags: { endpoint, field }
 */
export const fieldErrorCounter = new Counter("gims_field_errors");

/**
 * ErrorHandler wraps response validation and emits metrics.
 *
 * Usage:
 *   const eh = new ErrorHandler();
 *   eh.handle(res, { endpoint: "sales:orders" });
 *
 * @param {object} [options]
 * @param {boolean} [options.logDetails] - Log full error details (use ONLY in smoke tests)
 * @param {number} [options.maxLogBody] - Max body chars to log
 */
export class ErrorHandler {
	constructor(options = {}) {
		this.logDetails = options.logDetails || false;
		this.maxLogBody = options.maxLogBody || 500;
	}

	/**
	 * Inspect a response and emit error metrics if it failed.
	 *
	 * @param {object} res - k6 response object
	 * @param {object} meta - { endpoint: string, expectedStatus?: number }
	 */
	handle(res, meta = {}) {
		const endpoint = meta.endpoint || "unknown";
		const expectedStatus = meta.expectedStatus || null;
		const isError = !this._isSuccess(res, expectedStatus);

		if (!isError) return;

		const status = String(res.status);
		const errorType = this._classifyError(res);

		// Aggregate metric (lightweight — safe at 10K+ errors)
		errorCounter.add(1, { endpoint, status, error_type: errorType });

		// If GIMS field_errors present, count them
		const fieldErrors = this._extractFieldErrors(res);
		for (const fe of fieldErrors) {
			fieldErrorCounter.add(1, { endpoint, field: fe.field });
		}

		// Detailed logging — ONLY enable for smoke tests or debugging
		if (this.logDetails) {
			const traceId =
				res.request?.headers?.["Traceparent"] ||
				res.headers?.["X-Request-Id"] ||
				"none";
			console.error(
				`[ERROR] ${endpoint} | status=${status} | type=${errorType} | trace=${traceId} | body=${res.body?.substring(0, this.maxLogBody)}`,
			);
		}
	}

	_isSuccess(res, expectedStatus) {
		if (expectedStatus !== null) {
			return res.status === expectedStatus;
		}
		return res.status >= 200 && res.status < 300;
	}

	_classifyError(res) {
		if (res.status >= 500) return "server_error";
		if (res.status === 429) return "rate_limited";
		if (res.status === 409) return "conflict";
		if (res.status === 422) return "validation";
		if (res.status === 401) return "unauthorized";
		if (res.status === 403) return "forbidden";
		if (res.status === 404) return "not_found";
		if (res.status === 0) return "network_timeout";
		return "client_error";
	}

	_extractFieldErrors(res) {
		try {
			const body = res.json();
			const errs = body?.error?.field_errors;
			return Array.isArray(errs) ? errs : [];
		} catch (_) {
			return [];
		}
	}
}

/**
 * Convenience: wrap a check() call and emit error metrics on failure.
 *
 * @param {Function} checkFn - k6 check function
 * @param {object} res - k6 response
 * @param {object} checks - check definitions
 * @param {object} meta - { endpoint }
 * @returns {boolean} - true if all checks passed
 */
export function checked(checkFn, res, checks, meta = {}) {
	const result = checkFn(res, checks);
	if (!result) {
		const eh = new ErrorHandler({ logDetails: false });
		eh.handle(res, meta);
	}
	return result;
}
