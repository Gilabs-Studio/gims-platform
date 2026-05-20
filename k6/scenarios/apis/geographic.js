// k6/scenarios/apis/geographic.js
// Reusable scenario: Geographic module endpoints.

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listCountries(auth, params = {}) {
	const p = { ...getTaggedParams("geo:countries:list"), ...params };
	return authGet(`${API_V1}/geographic/countries`, auth, p);
}

export function listProvinces(auth, params = {}) {
	const p = { ...getTaggedParams("geo:provinces:list"), ...params };
	return authGet(`${API_V1}/geographic/provinces`, auth, p);
}

export function listCities(auth, params = {}) {
	const p = { ...getTaggedParams("geo:cities:list"), ...params };
	return authGet(`${API_V1}/geographic/cities`, auth, p);
}

export function listDistricts(auth, params = {}) {
	const p = { ...getTaggedParams("geo:districts:list"), ...params };
	return authGet(`${API_V1}/geographic/districts`, auth, p);
}

export function listVillages(auth, params = {}) {
	const p = { ...getTaggedParams("geo:villages:list"), ...params };
	return authGet(`${API_V1}/geographic/villages`, auth, p);
}

export function getMapData(auth, params = {}) {
	const p = { ...getTaggedParams("geo:map-data:get"), ...params };
	return authGet(`${API_V1}/geographic/map-data`, auth, p);
}
