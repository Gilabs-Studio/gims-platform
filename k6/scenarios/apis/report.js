// k6/scenarios/apis/report.js
// Reusable scenario: Report module endpoints.

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function getSalesOverview(auth, params = {}) {
	const p = { ...getTaggedParams("report:sales-overview:list"), ...params };
	return authGet(`${API_V1}/reports/sales-overview`, auth, p);
}

export function getProductAnalysis(auth, params = {}) {
	const p = { ...getTaggedParams("report:product-analysis:list"), ...params };
	return authGet(`${API_V1}/reports/product-analysis`, auth, p);
}

export function getGeoPerformance(auth, params = {}) {
	const p = { ...getTaggedParams("report:geo-performance:list"), ...params };
	return authGet(`${API_V1}/reports/geo-performance`, auth, p);
}

export function getCustomerResearch(auth, params = {}) {
	const p = { ...getTaggedParams("report:customer-research:list"), ...params };
	return authGet(`${API_V1}/reports/customer-research`, auth, p);
}

export function getSupplierResearch(auth, params = {}) {
	const p = { ...getTaggedParams("report:supplier-research:list"), ...params };
	return authGet(`${API_V1}/reports/supplier-research`, auth, p);
}
