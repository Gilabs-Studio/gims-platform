// k6/scenarios/e2e/journal-entry.js
// Finance Journal Entry workflow with debit/credit atomicity.

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost } from "../../auth-helper.js";
import { parseBody, isoDate, firstItem } from "../../lib/helpers.js";

const WORKFLOW_TAGS = { endpoint: "e2e:journal-entry", module: "finance", tier: "workflow" };

export function journalEntryCycle(auth, data) {
	const now = new Date();
	const entryDate = isoDate(now);

	// STEP 1: Create Journal Entry with balanced debit/credit
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
		tags: { name: "finance:journals:create", ...WORKFLOW_TAGS },
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
	if (!jeId) return null;

	// STEP 2: Submit JE
	const jeSubmit = authPost(`${API_V1}/finance/journal-entries/${jeId}/submit`, {}, auth, {
		tags: { name: "finance:journals:submit", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(jeSubmit, { "JE submitted": (r) => r.status >= 200 && r.status < 300 });

	// STEP 3: Approve JE
	if (jeSubmit.status < 300) {
		const jeApprove = authPost(`${API_V1}/finance/journal-entries/${jeId}/approve`, {}, auth, {
			tags: { name: "finance:journals:approve", ...WORKFLOW_TAGS },
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		check(jeApprove, { "JE approved": (r) => r.status >= 200 && r.status < 300 });
	}

	return { jeId };
}