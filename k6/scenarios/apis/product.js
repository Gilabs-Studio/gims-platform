// k6/scenarios/apis/product.js
// Reusable scenario: Product module endpoints (categories, brands, types, UoM, etc.)

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listProductCategories(auth, params = {}) {
	const p = { ...getTaggedParams("product:categories:list"), ...params };
	return authGet(`${API_V1}/product/product-categories`, auth, p);
}

export function listProductBrands(auth, params = {}) {
	const p = { ...getTaggedParams("product:brands:list"), ...params };
	return authGet(`${API_V1}/product/product-brands`, auth, p);
}

export function listProductSegments(auth, params = {}) {
	const p = { ...getTaggedParams("product:segments:list"), ...params };
	return authGet(`${API_V1}/product/product-segments`, auth, p);
}

export function listProductTypes(auth, params = {}) {
	const p = { ...getTaggedParams("product:types:list"), ...params };
	return authGet(`${API_V1}/product/product-types`, auth, p);
}

export function listUnitsOfMeasure(auth, params = {}) {
	const p = { ...getTaggedParams("product:uom:list"), ...params };
	return authGet(`${API_V1}/product/units-of-measure`, auth, p);
}

export function listPackaging(auth, params = {}) {
	const p = { ...getTaggedParams("product:packaging:list"), ...params };
	return authGet(`${API_V1}/product/packagings`, auth, p);
}

export function listProcurementTypes(auth, params = {}) {
	const p = { ...getTaggedParams("product:procurement-types:list"), ...params };
	return authGet(`${API_V1}/product/procurement-types`, auth, p);
}
