// k6/config.js
// Shared thresholds, environment variables, and workload configurations for GIMS ERP.

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8081";
export const API_V1 = `${BASE_URL}/api/v1`;

// Test credentials — override via environment variables:
//   k6 run -e TEST_EMAIL=admin@example.com -e TEST_PASSWORD=secret ...
export const CREDENTIALS = {
	email: __ENV.TEST_EMAIL || "admin@example.com",
	password: __ENV.TEST_PASSWORD || "admin123",
};

// Thresholds for pass/fail criteria.
// Adjust based on your SLOs.
export const THRESHOLDS = {
	// Availability: less than 1% HTTP errors
	http_req_failed: ["rate<0.01"],
	// Latency: 95th percentile < 500ms, 99th < 1000ms
	http_req_duration: ["p(95)<500", "p(99)<1000"],
};

// Stricter thresholds for critical endpoints (login, etc.)
export const CRITICAL_THRESHOLDS = {
	http_req_failed: ["rate<0.005"],
	http_req_duration: ["p(95)<300", "p(99)<800"],
};

// =============================================================================
// Workload Configurations
// =============================================================================

// Smoke test: minimal load to verify everything works
export const SMOKE_WORKLOAD = {
	executor: "shared-iterations",
	vus: 1,
	iterations: 5,
	maxDuration: "90s",
};

// Average load test: simulate normal business hours traffic
export const AVERAGE_LOAD_WORKLOAD = {
	executor: "ramping-vus",
	startVUs: 0,
	stages: [
		{ duration: "1m", target: 20 }, // ramp up
		{ duration: "3m", target: 20 }, // steady at 20 VUs
		{ duration: "1m", target: 0 }, // ramp down
	],
	gracefulRampDown: "30s",
};

// Stress test: find the breaking point
export const STRESS_WORKLOAD = {
	executor: "ramping-vus",
	startVUs: 0,
	stages: [
		{ duration: "1m", target: 50 }, // ramp to 50
		{ duration: "2m", target: 50 }, // hold at 50
		{ duration: "1m", target: 100 }, // ramp to 100
		{ duration: "2m", target: 100 }, // hold at 100
		{ duration: "1m", target: 200 }, // ramp to 200
		{ duration: "2m", target: 200 }, // hold at 200
		{ duration: "1m", target: 0 }, // ramp down
	],
	gracefulRampDown: "30s",
};

// Endurance/soak test: long-running to find memory leaks
export const SOAK_WORKLOAD = {
	executor: "ramping-vus",
	startVUs: 0,
	stages: [
		{ duration: "2m", target: 30 }, // ramp up
		{ duration: "28m", target: 30 }, // stay at 30 for 28 minutes
		{ duration: "2m", target: 0 }, // ramp down
	],
	gracefulRampDown: "1m",
};

// Spike test: sudden traffic burst
export const SPIKE_WORKLOAD = {
	executor: "ramping-vus",
	startVUs: 0,
	stages: [
		{ duration: "30s", target: 10 }, // baseline
		{ duration: "10s", target: 200 }, // spike!
		{ duration: "30s", target: 200 }, // hold spike
		{ duration: "10s", target: 10 }, // recover
		{ duration: "1m", target: 10 }, // baseline
		{ duration: "10s", target: 200 }, // spike again
		{ duration: "30s", target: 10 }, // recover
		{ duration: "30s", target: 0 }, // end
	],
};

// Breakpoint test: keep ramping until thresholds fail
export const BREAKPOINT_WORKLOAD = {
	executor: "ramping-vus",
	startVUs: 0,
	stages: [
		{ duration: "30s", target: 20 },
		{ duration: "30s", target: 50 },
		{ duration: "30s", target: 100 },
		{ duration: "30s", target: 150 },
		{ duration: "30s", target: 200 },
		{ duration: "30s", target: 300 },
		{ duration: "30s", target: 400 },
		{ duration: "30s", target: 500 },
	],
};

// =============================================================================
// Endpoint Registry
// =============================================================================

// Public endpoints (no auth required)
export const PUBLIC_ENDPOINTS = {
	health: `${BASE_URL}/health`,
	ping: `${BASE_URL}/ping`,
	apiRoot: `${API_V1}/`,
};

// Authenticated endpoint templates — VU code fills in IDs from test data
export const AUTH_ENDPOINTS = {
	login: `${API_V1}/auth/login`,
	csrf: `${API_V1}/auth/csrf`,
	logout: `${API_V1}/auth/logout`,
	refreshToken: `${API_V1}/auth/refresh-token`,
	me: `${API_V1}/users/me`,
	users: `${API_V1}/users`,
	roles: `${API_V1}/roles`,
	customers: `${API_V1}/customer/customers`,
	products: `${API_V1}/product/products`,
	warehouses: `${API_V1}/warehouse/warehouses`,
	suppliers: `${API_V1}/supplier/suppliers`,
	currency: `${API_V1}/master-data/currencies`,
	coa: `${API_V1}/finance/chart-of-accounts`,
	journals: `${API_V1}/finance/journal-entries`,
	budgets: `${API_V1}/finance/budget`,
	attendance: `${API_V1}/hrd/attendance`,
	leaves: `${API_V1}/hrd/leave-requests`,
	quotations: `${API_V1}/sales/sales-quotations`,
	orders: `${API_V1}/sales/sales-orders`,
	purchaseOrders: `${API_V1}/purchase/purchase-orders`,
	dashboard: `${API_V1}/general/dashboard/overview`,
	billing: `${API_V1}/billing/subscription`,
};

// Response validation helper
export function checkSuccess(check, res, extraChecks = {}) {
	const body = res.json();
	const checks = {
		"status is 2xx": (r) => r.status >= 200 && r.status < 300,
		"response has success field": () => body && body.success !== undefined,
		...extraChecks,
	};
	return check(res, checks);
}

export function checkList(check, res) {
	return checkSuccess(check, res, {
		"response has data array": (r) => {
			const body = r.json();
			return body && body.data && Array.isArray(body.data);
		},
	});
}
