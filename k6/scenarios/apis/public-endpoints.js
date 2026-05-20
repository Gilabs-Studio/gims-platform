// k6/scenarios/apis/public-endpoints.js
// Reusable scenario: Public (unauthenticated) endpoints.

import http from "k6/http";
import { BASE_URL } from "../../config.js";

export function healthCheck() {
	return http.get(`${BASE_URL}/health`, {
		tags: { name: "public:health", endpoint: "public:health", module: "public", tier: "crud" },
	});
}

export function pingCheck() {
	return http.get(`${BASE_URL}/ping`, {
		tags: { name: "public:ping", endpoint: "public:ping", module: "public", tier: "crud" },
	});
}

export function apiVersion() {
	return http.get(`${BASE_URL}/api/v1/`, {
		tags: { name: "public:api-version", endpoint: "public:api-version", module: "public", tier: "crud" },
	});
}