// k6/auth-helper.js
// GIMS ERP authentication helper for k6 tests.
//
// Flow:
// 1. GET /api/v1/auth/csrf  → captures CSRF cookie + X-CSRF-Token header
// 2. POST /api/v1/auth/login → sends email/password + CSRF header, receives JWT
// 3. All subsequent requests use Bearer token (CSRF-exempt per GIMS middleware)

import http from "k6/http";
import { check } from "k6";
import { API_V1, CREDENTIALS } from "./config.js";

const LOGIN_URL = `${API_V1}/auth/login`;
const CSRF_URL = `${API_V1}/auth/csrf`;

// Token cache keyed by email. Shared across iterations within the same VU.
const tokenCache = new Map();

function fetchCSRF() {
	return http.get(CSRF_URL);
}

function login(email, password) {
	const csrfRes = fetchCSRF();
	const headers = { "Content-Type": "application/json" };

	const csrfToken =
		csrfRes.headers["X-CSRF-Token"] ||
		(csrfRes.cookies && csrfRes.cookies["gims_csrf_token"]
			? csrfRes.cookies["gims_csrf_token"][0].value
			: "");

	if (csrfToken) {
		headers["X-CSRF-Token"] = csrfToken;
	}

	const payload = JSON.stringify({ email, password });
	const res = http.post(LOGIN_URL, payload, {
		headers,
		tags: { name: "auth:login", endpoint: "auth:login", module: "auth", tier: "crud" },
	});

	const success = check(res, {
		"login status is 2xx": (r) => r.status >= 200 && r.status < 300,
	});

	if (!success) {
		console.error(`Login failed: ${res.status} — ${res.body?.substring(0, 200)}`);
		return null;
	}

	try {
		const body = res.json();
		const data = body.data || body;

		const accessToken =
			res.cookies && res.cookies["gims_access_token"]
				? res.cookies["gims_access_token"][0].value
				: data.access_token || "";

		const refreshToken =
			res.cookies && res.cookies["gims_refresh_token"]
				? res.cookies["gims_refresh_token"][0].value
				: data.refresh_token || "";

		return {
			token: accessToken,
			refresh_token: refreshToken,
			expires_in: 3600,
			user: data.user || { email },
		};
	} catch (e) {
		console.error(`Failed to parse login response: ${e}`);
		return null;
	}
}

/**
 * Get a valid auth token for the given credentials.
 * Caches the token and reuses it across iterations.
 */
export function getAuthToken(credentials) {
	const creds = credentials || CREDENTIALS;
	const cacheKey = creds.email;

	if (tokenCache.has(cacheKey)) {
		return tokenCache.get(cacheKey);
	}

	const auth = login(creds.email, creds.password);
	if (auth) {
		tokenCache.set(cacheKey, auth);
	}
	return auth;
}

// ── Authenticated HTTP Helpers ────────────────────────────────────────────────
// All helpers accept (url, auth, params) — auth FIRST so it's never forgotten.

function authHeaders(auth, extra = {}) {
	const h = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${auth.token}`,
		...extra,
	};
	if (auth.csrfToken) {
		h["X-CSRF-Token"] = auth.csrfToken;
	}
	return h;
}

export function authGet(url, auth, params = {}) {
	return http.get(url, {
		headers: authHeaders(auth),
		tags: params.tags || { name: url },
		...params,
	});
}

export function authPost(url, body, auth, params = {}) {
	return http.post(url, JSON.stringify(body), {
		headers: authHeaders(auth),
		tags: params.tags || { name: url },
		...params,
	});
}

export function authPatch(url, body, auth, params = {}) {
	return http.patch(url, JSON.stringify(body), {
		headers: authHeaders(auth),
		tags: params.tags || { name: url },
		...params,
	});
}

export function authDelete(url, auth, params = {}) {
	return http.del(url, null, {
		headers: authHeaders(auth),
		tags: params.tags || { name: url },
		...params,
	});
}