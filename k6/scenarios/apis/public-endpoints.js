// k6/scenarios/apis/public-endpoints.js
// Reusable scenario: public endpoints (no auth required).

import { check } from "k6";
import http from "k6/http";
import { BASE_URL, API_V1, checkSuccess } from "../../config.js";

export function healthCheck(params = {}) {
	const res = http.get(`${BASE_URL}/health`, {
		tags: { name: "public:health" },
		...params,
	});
	check(res, {
		"health returns 200": (r) => r.status === 200,
		"health returns ok": (r) => r.json().status === "ok",
	});
	return res;
}

export function ping(params = {}) {
	const res = http.get(`${BASE_URL}/ping`, {
		tags: { name: "public:ping" },
		...params,
	});
	check(res, { "ping returns 200": (r) => r.status === 200 });
	return res;
}

export function apiRoot(params = {}) {
	const res = http.get(`${API_V1}/`, {
		tags: { name: "public:api-root" },
		...params,
	});
	checkSuccess(check, res, {
		"api root message present": (r) =>
			r.json().data && r.json().data.message,
	});
	return res;
}

export function csrfToken(params = {}) {
	const res = http.get(`${API_V1}/auth/csrf`, {
		tags: { name: "auth:csrf" },
		...params,
	});
	check(res, { "csrf returns 2xx": (r) => r.status >= 200 && r.status < 300 });
	return res;
}
