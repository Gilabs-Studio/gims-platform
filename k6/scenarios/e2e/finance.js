// k6/scenarios/e2e/finance.js
// Finance Module E2E Workflows — Journal entries, posting, validation.
//
// Exports:
//   - journalFlow(auth, data)              → Create balanced journal → post
//   - errorUnbalancedJournal(auth, data)   → Debit ≠ credit (expect rejection)
//   - errorRestrictedCOA(auth, data)       → Use trade control account (expect rejection)
//   - errorPostToClosedPeriod(auth, data)  → Post journal in closed fiscal period

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost } from "../../auth-helper.js";
import { parseBody, isoDate } from "../../lib/helpers.js";

const TAGS = { module: "finance", tier: "workflow" };

function tag(endpoint) {
	return { tags: { name: endpoint, endpoint, ...TAGS }, responseCallback: http.expectedStatuses({ min: 200, max: 599 }) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: Journal Entry Flow (create → post)
// ═══════════════════════════════════════════════════════════════════════════════
export function journalFlow(auth, data) {
	if (data.coaDebitId === "SETUP_MISSING" || data.coaCreditId === "SETUP_MISSING") return null;

	const jePayload = {
		company_id: data.companyId,
		entry_date: isoDate(new Date()),
		description: "K6 E2E Journal Test - " + Date.now(),
		reference: "K6-JE-" + Date.now(),
		lines: [
			{ chart_of_account_id: data.coaDebitId, debit: 100000, credit: 0, memo: "K6 test debit" },
			{ chart_of_account_id: data.coaCreditId, debit: 0, credit: 100000, memo: "K6 test credit" },
		],
	};

	// Create journal
	const jeRes = authPost(`${API_V1}/finance/journal-entries`, jePayload, auth, tag("finance:journal:create"));
	const je = parseBody(jeRes)?.data;
	check(jeRes, { "Journal created": (r) => r.status >= 200 && r.status < 300 && !!je?.id });
	if (!je?.id) return null;

	// Verify balanced
	const lines = je.lines || [];
	const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
	const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
	check(null, { "Journal balanced (debit = credit)": () => totalDebit === totalCredit });

	// Post journal
	const postRes = authPost(`${API_V1}/finance/journal-entries/${je.id}/post`, {}, auth, tag("finance:journal:post"));
	check(postRes, { "Journal posted": (r) => r.status >= 200 && r.status < 300 });

	// Verify status is posted
	if (postRes.status < 300) {
		const getRes = authGet(`${API_V1}/finance/journal-entries/${je.id}`, auth, tag("finance:journal:verify"));
		const posted = parseBody(getRes)?.data;
		check(null, { "Journal status is posted": () => posted?.status === "posted" });
	}

	return { journalId: je.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 2: Unbalanced Journal (debit ≠ credit)
// ═══════════════════════════════════════════════════════════════════════════════
export function errorUnbalancedJournal(auth, data) {
	if (data.coaDebitId === "SETUP_MISSING" || data.coaCreditId === "SETUP_MISSING") return null;

	const jePayload = {
		company_id: data.companyId,
		entry_date: isoDate(new Date()),
		description: "K6 Unbalanced Test",
		reference: "K6-UNBAL-" + Date.now(),
		lines: [
			{ chart_of_account_id: data.coaDebitId, debit: 100000, credit: 0, memo: "Debit" },
			{ chart_of_account_id: data.coaCreditId, debit: 0, credit: 50000, memo: "Credit (intentionally wrong)" },
		],
	};

	const jeRes = authPost(`${API_V1}/finance/journal-entries`, jePayload, auth, tag("finance:error:unbalanced"));
	check(jeRes, {
		"Unbalanced journal rejected": (r) => r.status >= 400,
	});

	return { rejected: jeRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 3: Restricted COA (trade control accounts)
// ═══════════════════════════════════════════════════════════════════════════════
export function errorRestrictedCOA(auth, data) {
	if (data.companyId === "SETUP_MISSING") return null;

	// Get COA list and find a restricted account (LIABILITY type like GR/IR Clearing)
	const coaRes = authGet(`${API_V1}/finance/chart-of-accounts`, auth, tag("finance:error:get-coa"));
	const coaData = parseBody(coaRes);
	const items = coaData?.data ? (Array.isArray(coaData.data) ? coaData.data : coaData.data.items || []) : [];

	// Find a restricted account (LIABILITY or ASSET type that's trade-control)
	const restricted = items.find(a => {
		const type = (a.type || "").toUpperCase();
		return type === "LIABILITY" || type === "RECEIVABLE" || type === "PAYABLE";
	});

	if (!restricted) return null;

	const jePayload = {
		company_id: data.companyId,
		entry_date: isoDate(new Date()),
		description: "K6 Restricted COA Test",
		reference: "K6-RESTRICTED-" + Date.now(),
		lines: [
			{ chart_of_account_id: restricted.id, debit: 50000, credit: 0, memo: "Restricted debit" },
			{ chart_of_account_id: restricted.id, debit: 0, credit: 50000, memo: "Restricted credit" },
		],
	};

	const jeRes = authPost(`${API_V1}/finance/journal-entries`, jePayload, auth, tag("finance:error:restricted-coa"));
	check(jeRes, {
		"Restricted COA rejected": (r) => r.status >= 400,
	});

	return { rejected: jeRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 4: Double-post journal
// ═══════════════════════════════════════════════════════════════════════════════
export function errorDoublePost(auth, data) {
	if (data.coaDebitId === "SETUP_MISSING" || data.coaCreditId === "SETUP_MISSING") return null;

	// Create and post a journal
	const jePayload = {
		company_id: data.companyId,
		entry_date: isoDate(new Date()),
		description: "K6 Double Post Test",
		reference: "K6-DBLPOST-" + Date.now(),
		lines: [
			{ chart_of_account_id: data.coaDebitId, debit: 25000, credit: 0, memo: "Debit" },
			{ chart_of_account_id: data.coaCreditId, debit: 0, credit: 25000, memo: "Credit" },
		],
	};

	const jeRes = authPost(`${API_V1}/finance/journal-entries`, jePayload, auth, tag("finance:error:create-for-dblpost"));
	const jeId = parseBody(jeRes)?.data?.id;
	if (!jeId) return null;

	// Post first time (should succeed)
	authPost(`${API_V1}/finance/journal-entries/${jeId}/post`, {}, auth, tag("finance:error:first-post"));

	// Post second time (should fail or be idempotent)
	const secondPost = authPost(`${API_V1}/finance/journal-entries/${jeId}/post`, {}, auth, tag("finance:error:double-post"));
	check(secondPost, {
		"Double-post handled": (r) => r.status >= 200 && r.status < 500,
	});

	return { journalId: jeId, rejected: secondPost.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER: Execute all Finance workflows (called by profiler)
// ═══════════════════════════════════════════════════════════════════════════════
export function runFinanceWorkflows(auth, data) {
	if (data.companyId === "SETUP_MISSING") return;

	// Happy paths
	journalFlow(auth, data);

	// Error cases
	errorUnbalancedJournal(auth, data);
	errorRestrictedCOA(auth, data);
	errorDoublePost(auth, data);
}
