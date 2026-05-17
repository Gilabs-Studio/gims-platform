// k6/scenarios/e2e/journal-entry.js
// Finance Journal Entry workflow with debit/credit atomicity.
//
// Correct GIMS API paths:
//   POST /finance/journal-entries              → Create JE (also /journals, /accounting/journal-entries)
//   POST /finance/journal-entries/:id/submit    → Submit JE
//   POST /finance/journal-entries/:id/approve   → Approve JE
//   GET  /finance/chart-of-accounts             → List COA

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost } from "../../auth-helper.js";
import { parseBody, isoDate, firstItem, requiredId } from "../../lib/helpers.js";

export function journalEntryCycle(auth, data) {
	const now = new Date();
	const entryDate = isoDate(now);

	// STEP 1: Create Journal Entry with balanced debit/credit
	// Required fields: company_id, entry_date, lines (min 2), chart_of_account_id
	const jePayload = {
		company_id: data.companyId,
		entry_date: entryDate,
		description: `K6 Journal Test - ${Date.now()}`,
		reference: `K6-JE-${Date.now()}`,
		lines: [
			{ chart_of_account_id: data.coaDebitId, debit: 50000, credit: 0, memo: "K6 test debit entry" },
			{ chart_of_account_id: data.coaCreditId, debit: 0, credit: 50000, memo: "K6 test credit entry" },
		],
	};

	const jeRes = authPost(`${API_V1}/finance/journal-entries`, jePayload, auth, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const jeId = parseBody(jeRes)?.data?.id;
	check(jeRes, {
		"Journal created": (r) => r.status >= 200 && r.status < 300 && !!jeId,
		"Debit = Credit": () => {
			const lines = parseBody(jeRes)?.data?.lines;
			if (!Array.isArray(lines) || lines.length < 2) return false;
			const totalDebit = lines.reduce((s, i) => s + (Number(i.debit) || 0), 0);
			const totalCredit = lines.reduce((s, i) => s + (Number(i.credit) || 0), 0);
			return totalDebit === totalCredit;
		},
	});
	if (!jeId) {
		console.error(`JE create failed: ${jeRes.status}`);
		return null;
	}

	// STEP 2: Journal status: submit → approve (action endpoints)
	const jeSubmitted = authPost(`${API_V1}/finance/journal-entries/${jeId}/submit`, {}, auth, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(jeSubmitted, { "JE submitted": (r) => r.status >= 200 && r.status < 300 });

	const jeApproved = authPost(`${API_V1}/finance/journal-entries/${jeId}/approve`, {}, auth, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(jeApproved, { "JE approved": (r) => r.status >= 200 && r.status < 300 });

	// STEP 3: Verify final state
	const jeFinal = authGet(`${API_V1}/finance/journal-entries/${jeId}`, auth);
	const jeFinalData = parseBody(jeFinal)?.data;
	check(jeFinal, {
		"JE final state retrieved": (r) => r.status === 200,
		"JE is posted/approved": () => ["posted", "approved", "APPROVED"].includes(jeFinalData?.status),
	});

	return { journalId: jeId };
}

export function journalEntrySetup(auth) {
	const coaRes = authGet(`${API_V1}/finance/chart-of-accounts?per_page=100`, auth);
	const coaItems = parseBody(coaRes)?.data;
	let coaDebitId = null;
	let coaCreditId = null;

	if (Array.isArray(coaItems)) {
		for (const item of coaItems) {
			if (!coaDebitId && item?.id) coaDebitId = item.id;
			if (!coaCreditId && item?.id && item.id !== coaDebitId) coaCreditId = item.id;
			if (coaDebitId && coaCreditId) break;
		}
	}

	// Get company_id from auth user (required for JE creation)
	const meRes = authGet(`${API_V1}/users/me`, auth);
	const companyId = parseBody(meRes)?.data?.company_id || parseBody(meRes)?.data?.tenant_id;

	return {
		auth,
		companyId: companyId || null,
		coaDebitId: requiredId("coaDebitId (need COA)", coaDebitId),
		coaCreditId: requiredId("coaCreditId (need 2 COA accounts)", coaCreditId),
	};
}