// k6/auth-helper.js
// GIMS ERP authentication helper for k6 tests.
//
// GIMS uses a two-step auth flow:
// 1. GET /api/v1/auth/csrf  → captures CSRF cookie
// 2. POST /api/v1/auth/login → sends email/password + CSRF header, receives JWT token
// 3. All subsequent requests use the JWT token from step 2
//
// This module handles token caching across VU iterations so we don't
// re-authenticate on every iteration.

import http from "k6/http";
import { check } from "k6";
import { API_V1, CREDENTIALS } from "./config.js";

const LOGIN_URL = `${API_V1}/auth/login`;
const CSRF_URL = `${API_V1}/auth/csrf`;

// In-memory token cache keyed by email.
// Shared across iterations within the same VU.
const tokenCache = new Map();

/**
 * Fetch a CSRF token cookie from the server.
 * Returns the full response so callers can extract Set-Cookie headers.
 */
function fetchCSRF() {
	return http.get(CSRF_URL);
}

/**
 * Authenticate with email + password.
 * Returns { token, refresh_token, expires_in, user } on success, or null.
 *
 * GIMS stores JWT in HttpOnly cookies (gims_access_token, gims_refresh_token),
 * NOT in the response body. The body has access_token: "" intentionally.
 * We extract the real token from the Set-Cookie header.
 * The AuthMiddleware supports both Bearer and cookie auth — we use Bearer
 * so POST/PUT/DELETE skip CSRF (Bearer requests are CSRF-exempt per csrf.go).
 */
function login(email, password) {
	const csrfRes = fetchCSRF();

	// Build headers from CSRF response cookies + default
	const headers = { "Content-Type": "application/json" };

	// GIMS uses "Double-Submit Cookie" CSRF pattern:
	// 1. GET /auth/csrf sets cookie "gims_csrf_token" AND echoes it in X-CSRF-Token response header
	// 2. POST /auth/login must send X-CSRF-Token header with that value
	// 3. k6's cookie jar automatically sends the cookie on subsequent requests
	//
	// Prefer the response header (more reliable), fallback to cookie jar.
	const csrfToken =
		csrfRes.headers["X-CSRF-Token"] ||
		(csrfRes.cookies && csrfRes.cookies["gims_csrf_token"]
			? csrfRes.cookies["gims_csrf_token"][0].value
			: "");

	if (csrfToken) {
		headers["X-CSRF-Token"] = csrfToken;
	}

	const payload = JSON.stringify({
		email: email,
		password: password,
	});

	const res = http.post(LOGIN_URL, payload, {
		headers,
		tags: { name: "auth:login" },
	});

	const success = check(res, {
		"login status is 2xx": (r) => r.status >= 200 && r.status < 300,
	});

	if (!success) {
		console.error(`Login failed: ${res.status} — ${res.body}`);
		return null;
	}

	try {
		const body = res.json();
		const data = body.data || body;

		// Tokens are in HttpOnly cookies, NOT in the response body.
		// The body has access_token: "" and refresh_token: "" intentionally.
		const accessToken =
			res.cookies && res.cookies["gims_access_token"]
				? res.cookies["gims_access_token"][0].value
				: "";
		const refreshToken =
			res.cookies && res.cookies["gims_refresh_token"]
				? res.cookies["gims_refresh_token"][0].value
				: "";

		if (!accessToken) {
			console.error(
				`Login response missing gims_access_token cookie. ` +
					`Available cookies: ${JSON.stringify(Object.keys(res.cookies || {}))}`,
			);
			return null;
		}

		return {
			token: accessToken,
			refresh_token: refreshToken,
			// JWT TTL from config (cookie is HttpOnly — no TTL in body)
			expires_in: 3600,
			user: data.user,
		};
	} catch (e) {
		console.error(`Failed to parse login response: ${e}`);
		return null;
	}
}

/**
 * Get a valid auth token for the given credentials.
 * Caches the token and reuses it across iterations.
 * Re-authenticates if the cached token is expired or missing.
 *
 * @param {object} [credentials] - { email, password }. Defaults to CREDENTIALS from config.
 * @returns {object|null} - { token, refreshToken, expiresIn, user } or null on failure
 */
export function getAuthToken(credentials) {
	const creds = credentials || CREDENTIALS;
	const cacheKey = creds.email;

	const cached = tokenCache.get(cacheKey);
	if (cached) {
		// We don't have an absolute expiry check here because k6 iterations
		// are typically much shorter than JWT TTL (1+ hour).
		// For very long soak tests, uncomment the expiry check below:
		// if (Date.now() / 1000 < cached.expiresAt) {
		return cached;
		// }
	}

	const data = login(creds.email, creds.password);
	if (!data) {
		return null;
	}

	const entry = {
		token: data.token,
		refreshToken: data.refresh_token,
		expiresIn: data.expires_in || 3600,
		expiresAt: Date.now() / 1000 + (data.expires_in || 3600) - 60, // 60s buffer
		user: data.user,
	};

	tokenCache.set(cacheKey, entry);
	return entry;
}

/**
 * Build authentication headers for an API request.
 *
 * @param {object} auth - Result from getAuthToken()
 * @returns {object} Headers object with Authorization and Content-Type
 */
export function authHeaders(auth) {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${auth.token}`,
	};
}

/**
 * Helper: perform an authenticated GET request.
 *
 * @param {string} url - Full URL
 * @param {object} auth - Auth token object
 * @param {object} [params] - Additional k6 http params
 * @returns {object} k6 response
 */
export function authGet(url, auth, params = {}) {
	return http.get(url, {
		...params,
		headers: { ...authHeaders(auth), ...(params.headers || {}) },
	});
}

/**
 * Helper: perform an authenticated POST request.
 *
 * @param {string} url - Full URL
 * @param {object} body - JSON body
 * @param {object} auth - Auth token object
 * @param {object} [params] - Additional k6 http params
 * @returns {object} k6 response
 */
export function authPost(url, body, auth, params = {}) {
	return http.post(url, JSON.stringify(body), {
		...params,
		headers: { ...authHeaders(auth), ...(params.headers || {}) },
	});
}

/**
 * Helper: perform an authenticated PATCH request.
 *
 * @param {string} url - Full URL
 * @param {object} body - JSON body
 * @param {object} auth - Auth token object
 * @param {object} [params] - Additional k6 http params
 * @returns {object} k6 response
 */
export function authPatch(url, body, auth, params = {}) {
	return http.patch(url, JSON.stringify(body), {
		...params,
		headers: { ...authHeaders(auth), ...(params.headers || {}) },
	});
}

/**
 * Clear the token cache. Call in teardown() if needed.
 */
export function clearTokenCache() {
	tokenCache.clear();
}
