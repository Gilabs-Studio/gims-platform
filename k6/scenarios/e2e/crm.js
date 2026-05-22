// k6/scenarios/e2e/crm.js
// CRM Module E2E Workflows — Lead pipeline, deal management, activities.
//
// Exports:
//   - leadToDealFlow(auth, data)         → Create lead → convert to deal
//   - dealPipelineFlow(auth, data)       → Create deal → move stages → won → convert to SQ
//   - activityFlow(auth, data)           → Create activity on lead/deal
//   - errorConvertLostLead(auth, data)   → Convert a lost lead (expect rejection)
//   - errorDoubleConvert(auth, data)     → Convert already-converted lead
//   - errorMovedConvertedDeal(auth, data) → Move stage on converted deal

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost, authPatch } from "../../auth-helper.js";
import { parseBody, isoDate } from "../../lib/helpers.js";

const TAGS = { module: "crm", tier: "workflow" };

function tag(endpoint) {
	return { tags: { name: endpoint, endpoint, ...TAGS }, responseCallback: http.expectedStatuses({ min: 200, max: 599 }) };
}

// ── Helper: Get pipeline stages ──────────────────────────────────────────────
function getPipelineStages(auth) {
	const res = authGet(`${API_V1}/crm/pipeline-stages`, auth, tag("crm:stages:list"));
	const data = parseBody(res);
	const items = data?.data ? (Array.isArray(data.data) ? data.data : data.data.items || []) : [];
	return items;
}

// ── Helper: Get lead sources ─────────────────────────────────────────────────
function getLeadSources(auth) {
	const res = authGet(`${API_V1}/crm/lead-sources`, auth, tag("crm:sources:list"));
	const data = parseBody(res);
	const items = data?.data ? (Array.isArray(data.data) ? data.data : data.data.items || []) : [];
	return items;
}

// ── Helper: Get lead statuses ────────────────────────────────────────────────
function getLeadStatuses(auth) {
	const res = authGet(`${API_V1}/crm/lead-statuses`, auth, tag("crm:statuses:list"));
	const data = parseBody(res);
	const items = data?.data ? (Array.isArray(data.data) ? data.data : data.data.items || []) : [];
	return items;
}

// ── Helper: Create a lead ────────────────────────────────────────────────────
function createLead(auth, data, sourceId, statusId) {
	const leadPayload = {
		first_name: "K6 Test",
		last_name: "Lead " + Date.now(),
		company_name: "K6 Test Company",
		email: "k6-" + Date.now() + "@test.com",
		phone: "08123456789",
		lead_source_id: sourceId,
		lead_status_id: statusId,
		estimated_value: 50000000,
	};
	const res = authPost(`${API_V1}/crm/leads`, leadPayload, auth, tag("crm:lead:create"));
	return parseBody(res)?.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: Lead to Deal Conversion
// ═══════════════════════════════════════════════════════════════════════════════
export function leadToDealFlow(auth, data) {
	const sources = getLeadSources(auth);
	const statuses = getLeadStatuses(auth);
	const stages = getPipelineStages(auth);

	if (sources.length === 0 || statuses.length === 0 || stages.length === 0) return null;

	const sourceId = sources[0]?.id;
	const statusId = statuses.find(s => s.code !== "LOST" && !s.is_converted)?.id || statuses[0]?.id;

	// Step 1: Create lead
	const lead = createLead(auth, data, sourceId, statusId);
	check(null, { "Lead created": () => lead !== null && !!lead.id });
	if (!lead) return null;

	// Step 2: Convert lead to deal
	const firstStage = stages.find(s => !s.is_won && !s.is_lost) || stages[0];
	const convertPayload = {
		pipeline_stage_id: firstStage?.id,
		deal_name: "K6 Deal from Lead " + Date.now(),
		expected_close_date: isoDate(new Date(Date.now() + 30 * 86400000)),
		value: 50000000,
	};
	const convertRes = authPost(`${API_V1}/crm/leads/${lead.id}/convert`, convertPayload, auth, tag("crm:lead:convert"));
	const convertData = parseBody(convertRes);
	check(convertRes, { "Lead converted to deal": (r) => r.status >= 200 && r.status < 300 });

	return { leadId: lead.id, dealId: convertData?.data?.deal_id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 2: Deal Pipeline Flow (move stages → won → convert to SQ)
// ═══════════════════════════════════════════════════════════════════════════════
export function dealPipelineFlow(auth, data) {
	const stages = getPipelineStages(auth);
	if (stages.length < 2) return null;

	const openStage = stages.find(s => !s.is_won && !s.is_lost) || stages[0];
	const wonStage = stages.find(s => s.is_won);
	if (!wonStage) return null;

	// Step 1: Create deal directly
	const dealPayload = {
		title: "K6 Pipeline Deal " + Date.now(),
		pipeline_stage_id: openStage.id,
		expected_close_date: isoDate(new Date(Date.now() + 30 * 86400000)),
		value: 75000000,
		customer_id: data.customerId !== "SETUP_MISSING" ? data.customerId : undefined,
	};
	const dealRes = authPost(`${API_V1}/crm/deals`, dealPayload, auth, tag("crm:deal:create"));
	const deal = parseBody(dealRes)?.data;
	check(dealRes, { "Deal created": (r) => r.status >= 200 && r.status < 300 && !!deal?.id });
	if (!deal?.id) return null;

	// Step 2: Move to won stage
	const moveRes = authPost(`${API_V1}/crm/deals/${deal.id}/move-stage`, {
		to_stage_id: wonStage.id,
		reason: "Customer accepted proposal - K6 test",
	}, auth, tag("crm:deal:move-won"));
	check(moveRes, { "Deal moved to won": (r) => r.status >= 200 && r.status < 300 });

	// Step 3: Convert to quotation (cross-module with Sales)
	if (moveRes.status < 300 && data.customerId !== "SETUP_MISSING") {
		const convertRes = authPost(`${API_V1}/crm/deals/${deal.id}/convert-to-quotation`, {
			customer_id: data.customerId,
			payment_terms_id: data.paymentTermsId,
			sales_rep_id: data.salesRepId,
			business_unit_id: data.businessUnitId,
		}, auth, tag("crm:deal:convert-sq"));
		check(convertRes, { "Deal converted to SQ": (r) => r.status >= 200 && r.status < 300 });
	}

	return { dealId: deal.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 3: Activity Flow
// ═══════════════════════════════════════════════════════════════════════════════
export function activityFlow(auth, data) {
	// Get activity types
	const typesRes = authGet(`${API_V1}/crm/activity-types`, auth, tag("crm:activity-types:get"));
	const types = parseBody(typesRes)?.data || [];
	const activityTypeItems = Array.isArray(types) ? types : types.items || [];
	if (activityTypeItems.length === 0) return null;

	const activityPayload = {
		type: activityTypeItems[0]?.code || activityTypeItems[0]?.name,
		activity_type_id: activityTypeItems[0]?.id,
		subject: "K6 Load Test Activity " + Date.now(),
		description: "Performance testing activity for CRM module",
		activity_date: isoDate(new Date()),
		status: "planned",
	};

	const actRes = authPost(`${API_V1}/crm/activities`, activityPayload, auth, tag("crm:activity:create"));
	const activity = parseBody(actRes)?.data;
	check(actRes, { "Activity created": (r) => r.status >= 200 && r.status < 300 });

	return { activityId: activity?.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 4: Convert Lost Lead
// ═══════════════════════════════════════════════════════════════════════════════
export function errorConvertLostLead(auth, data) {
	const sources = getLeadSources(auth);
	const statuses = getLeadStatuses(auth);
	const stages = getPipelineStages(auth);

	if (sources.length === 0 || statuses.length === 0) return null;

	const lostStatus = statuses.find(s => s.code === "LOST");
	if (!lostStatus) return null; // No lost status configured

	const sourceId = sources[0]?.id;

	// Create lead with lost status
	const lead = createLead(auth, data, sourceId, lostStatus.id);
	if (!lead) return null;

	// Try to convert (should fail)
	const firstStage = stages.find(s => !s.is_won && !s.is_lost) || stages[0];
	const convertRes = authPost(`${API_V1}/crm/leads/${lead.id}/convert`, {
		pipeline_stage_id: firstStage?.id,
		deal_name: "Should Fail",
		value: 1000,
	}, auth, tag("crm:error:convert-lost"));

	check(convertRes, {
		"Lost lead conversion rejected": (r) => r.status >= 400,
	});

	return { leadId: lead.id, rejected: convertRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 5: Double Convert Lead
// ═══════════════════════════════════════════════════════════════════════════════
export function errorDoubleConvert(auth, data) {
	const sources = getLeadSources(auth);
	const statuses = getLeadStatuses(auth);
	const stages = getPipelineStages(auth);

	if (sources.length === 0 || statuses.length === 0 || stages.length === 0) return null;

	const sourceId = sources[0]?.id;
	const statusId = statuses.find(s => s.code !== "LOST" && !s.is_converted)?.id || statuses[0]?.id;
	const firstStage = stages.find(s => !s.is_won && !s.is_lost) || stages[0];

	// Create and convert lead
	const lead = createLead(auth, data, sourceId, statusId);
	if (!lead) return null;

	authPost(`${API_V1}/crm/leads/${lead.id}/convert`, {
		pipeline_stage_id: firstStage?.id,
		deal_name: "First Convert",
		value: 1000,
	}, auth, tag("crm:error:first-convert"));

	// Try to convert again (should fail)
	const secondRes = authPost(`${API_V1}/crm/leads/${lead.id}/convert`, {
		pipeline_stage_id: firstStage?.id,
		deal_name: "Second Convert Should Fail",
		value: 2000,
	}, auth, tag("crm:error:double-convert"));

	check(secondRes, {
		"Double conversion rejected": (r) => r.status >= 400 && r.status < 500,
	});

	return { leadId: lead.id, rejected: secondRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 6: Move Stage on Converted Deal
// ═══════════════════════════════════════════════════════════════════════════════
export function errorMoveConvertedDeal(auth, data) {
	const stages = getPipelineStages(auth);
	if (stages.length < 2) return null;

	const openStage = stages.find(s => !s.is_won && !s.is_lost) || stages[0];
	const wonStage = stages.find(s => s.is_won);
	if (!wonStage) return null;

	// Create deal + move to won + convert to SQ
	const dealRes = authPost(`${API_V1}/crm/deals`, {
		title: "K6 Convert Test " + Date.now(),
		pipeline_stage_id: openStage.id,
		expected_close_date: isoDate(new Date(Date.now() + 30 * 86400000)),
		value: 10000000,
		customer_id: data.customerId !== "SETUP_MISSING" ? data.customerId : undefined,
	}, auth, tag("crm:error:create-deal"));
	const dealId = parseBody(dealRes)?.data?.id;
	if (!dealId) return null;

	// Move to won
	authPost(`${API_V1}/crm/deals/${dealId}/move-stage`, {
		to_stage_id: wonStage.id,
		reason: "Won for test",
	}, auth, tag("crm:error:move-won"));

	// Convert to quotation
	if (data.customerId !== "SETUP_MISSING") {
		authPost(`${API_V1}/crm/deals/${dealId}/convert-to-quotation`, {
			customer_id: data.customerId,
			payment_terms_id: data.paymentTermsId,
			sales_rep_id: data.salesRepId,
			business_unit_id: data.businessUnitId,
		}, auth, tag("crm:error:convert-sq"));
	}

	// Try to move stage again (should fail — already converted)
	const moveRes = authPost(`${API_V1}/crm/deals/${dealId}/move-stage`, {
		to_stage_id: openStage.id,
	}, auth, tag("crm:error:move-converted"));

	check(moveRes, {
		"Move converted deal rejected": (r) => r.status >= 400 && r.status < 500,
	});

	return { dealId, rejected: moveRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER: Execute all CRM workflows (called by profiler)
// ═══════════════════════════════════════════════════════════════════════════════
export function runCRMWorkflows(auth, data) {
	// Happy paths
	leadToDealFlow(auth, data);
	dealPipelineFlow(auth, data);
	activityFlow(auth, data);

	// Error cases
	errorConvertLostLead(auth, data);
	errorDoubleConvert(auth, data);
	errorMoveConvertedDeal(auth, data);
}
