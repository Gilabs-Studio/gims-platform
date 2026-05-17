// k6/lib/api-client.js
// Object-oriented API client for GIMS ERP.
// Encapsulates HTTP calls so API changes only require updates here.

import http from "k6/http";
import { authGet, authPost, authPatch } from "../auth-helper.js";

/**
 * GIMS API client wrapper.
 * Automatically tags requests and provides domain-specific methods.
 */
export class GIMSClient {
	constructor(auth, baseTags = {}) {
		this.auth = auth;
		this.baseTags = baseTags;
	}

	get(url, params = {}) {
		return authGet(url, this.auth, this._mergeParams(params));
	}

	post(url, body, params = {}) {
		return authPost(url, body, this.auth, this._mergeParams(params));
	}

	patch(url, body, params = {}) {
		return authPatch(url, body, this.auth, this._mergeParams(params));
	}

	_mergeParams(params) {
		return {
			tags: { ...this.baseTags, ...(params.tags || {}) },
			...params,
		};
	}
}

/**
 * Generic API client for any REST API.
 * Lower-level than GIMSClient; useful for non-GIMS endpoints.
 */
export class APIClient {
	constructor(token, baseUrl) {
		this.token = token;
		this.baseUrl = baseUrl;
	}

	_getHeaders(extra = {}) {
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.token}`,
			...extra,
		};
	}

	create(type, data, options = {}) {
		const res = http.post(`${this.baseUrl}/${type}`, JSON.stringify(data), {
			headers: this._getHeaders(options.headers),
			...options,
		});
		return { data: safeJson(res), res };
	}

	find(type, id, options = {}) {
		const res = http.get(`${this.baseUrl}/${type}/${id}`, {
			headers: this._getHeaders(options.headers),
			...options,
		});
		return { data: safeJson(res), res };
	}

	list(type, query = "", options = {}) {
		const url = query
			? `${this.baseUrl}/${type}?${query}`
			: `${this.baseUrl}/${type}`;
		const res = http.get(url, {
			headers: this._getHeaders(options.headers),
			...options,
		});
		return { data: safeJson(res), res };
	}

	update(type, id, data, options = {}) {
		const res = http.patch(
			`${this.baseUrl}/${type}/${id}`,
			JSON.stringify(data),
			{
				headers: this._getHeaders(options.headers),
				...options,
			},
		);
		return { data: safeJson(res), res };
	}

	remove(type, id, options = {}) {
		const res = http.del(`${this.baseUrl}/${type}/${id}`, null, {
			headers: this._getHeaders(options.headers),
			...options,
		});
		return { data: safeJson(res), res };
	}
}

function safeJson(res) {
	try {
		return res.json();
	} catch (_) {
		return null;
	}
}
