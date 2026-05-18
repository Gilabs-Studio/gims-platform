// k6/lib/api-client.js
// Object-oriented API client for GIMS ERP.
// Wraps auth-helper functions and auto-tags requests via endpoint registry.

import http from "k6/http";
import { authGet, authPost, authPatch, authDelete } from "../auth-helper.js";
import { getTaggedParams, endpointURL } from "./endpoint-registry.js";

export class GIMSClient {
	constructor(auth, baseTags = {}) {
		this.auth = auth;
		this.baseTags = baseTags;
	}

	_getParams(endpointName, extra = {}) {
		const tagged = getTaggedParams(endpointName);
		return {
			...tagged,
			tags: { ...tagged.tags, ...this.baseTags, ...(extra.tags || {}) },
			...extra,
		};
	}

	get(endpointName, extra = {}) {
		const url = endpointURL(endpointName);
		const params = this._getParams(endpointName, extra);
		return authGet(url, this.auth, params);
	}

	getURL(url, params = {}) {
		return authGet(url, this.auth, params);
	}

	post(endpointName, body, extra = {}) {
		const url = endpointURL(endpointName);
		const params = this._getParams(endpointName, extra);
		return authPost(url, body, this.auth, params);
	}

	postURL(url, body, params = {}) {
		return authPost(url, body, this.auth, params);
	}

	patch(endpointName, body, extra = {}) {
		const url = endpointURL(endpointName);
		const params = this._getParams(endpointName, extra);
		return authPatch(url, body, this.auth, params);
	}

	patchURL(url, body, params = {}) {
		return authPatch(url, body, this.auth, params);
	}

	delete(endpointName, extra = {}) {
		const url = endpointURL(endpointName);
		const params = this._getParams(endpointName, extra);
		return authDelete(url, this.auth, params);
	}
}

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
		return http.post(`${this.baseUrl}/${type}`, JSON.stringify(data), {
			headers: this._getHeaders(options.headers),
			...options,
		});
	}
}