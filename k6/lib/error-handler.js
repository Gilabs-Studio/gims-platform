// k6/lib/error-handler.js
// Centralized error handling for GIMS k6 tests.
// At high load, failures number in the thousands — aggregate, don't log everything.

import { check } from "k6";
import { Counter } from "k6/metrics";

export const errorCounter = new Counter("gims_errors");
export const fieldErrorCounter = new Counter("gims_field_errors");

export class ErrorHandler {
	constructor(options = {}) {
		this.logDetails = options.logDetails || false;
		this.maxLogBody = options.maxLogBody || 500;
	}

	handle(res, context = {}) {
		const tags = {
			endpoint: context.endpoint || res.request?.url || "unknown",
			status: String(res.status),
			error_type: res.status >= 500 ? "server" : res.status >= 400 ? "client" : "unknown",
		};

		if (res.status >= 400) {
			errorCounter.add(1, tags);

			if (this.logDetails) {
				const body = res.body ? res.body.substring(0, this.maxLogBody) : "";
				console.error(`[${tags.status}] ${tags.endpoint}: ${body}`);
			}

			// Extract field errors from GIMS 422 responses
			if (res.status === 422) {
				try {
					const body = res.json();
					const fieldErrors = body?.error?.field_errors;
					if (Array.isArray(fieldErrors)) {
						for (const fe of fieldErrors) {
							fieldErrorCounter.add(1, { endpoint: tags.endpoint, field: fe.field || "unknown" });
						}
					}
				} catch (_) {
					// ignore parse errors
				}
			}
		}

		return res.status < 400;
	}

	handleBulk(responses, context = {}) {
		let failures = 0;
		for (const res of responses) {
			if (!this.handle(res, context)) {
				failures++;
			}
		}
		return failures;
	}
}