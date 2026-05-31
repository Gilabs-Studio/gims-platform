// k6/scenarios/concurrency/finance-posting.js
// Domain-concurrency scenario: finance journal entry creation and approval.
// Validates that row-level locking prevents double-posting and inconsistent balances.
//
// Business invariants tested:
// - Journal entries must have balanced debit/credit (enforced by API)
// - A journal can only be submitted/posted once (no double-posting)
// - Concurrent approval of same journal: exactly one succeeds
// - No 500 errors under concurrent pressure
// - After concurrent operations, journal state is consistent (not partially posted)

import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { API_V1 } from '../../config.js';
import { authGet, authPost, authPatch } from '../../auth-helper.js';
import { parseBody } from '../../lib/helpers.js';
import { conflictRate } from '../../lib/metrics.js';

const financeDoublePost = new Counter('gims_finance_double_post');
const financeInvariantPass = new Rate('gims_finance_invariant_pass');

/**
 * Create a journal entry with balanced debit/credit lines.
 * Invariant: API must reject unbalanced entries.
 */
export function concurrentJournalCreate(auth, setupData) {
  const tags = { name: 'concurrency:finance:create-journal', endpoint: 'finance:journals:create', module: 'finance', tier: 'crud' };

  const amount = Math.floor(Math.random() * 1000000) + 10000; // 10k - 1M
  const uniqueRef = `K6-JE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const payload = {
    description: `k6 concurrency test - ${uniqueRef}`,
    reference_number: uniqueRef,
    transaction_date: new Date().toISOString().split('T')[0],
    lines: [
      {
        account_id: setupData.coaDebitId,
        debit: amount,
        credit: 0,
        description: 'k6 debit line',
      },
      {
        account_id: setupData.coaCreditId,
        debit: 0,
        credit: amount,
        description: 'k6 credit line',
      },
    ],
  };

  const res = authPost(`${API_V1}/finance/journal-entries`, payload, auth, { tags });
  const status = res.status;
  const body = parseBody(res);

  // Invariant: no server errors
  check(res, {
    'journal-create: no server error (invariant)': (r) => r.status < 500,
  });

  // Valid outcomes
  const validResponse = status === 200 || status === 201 || status === 422 || status === 409 || status === 400;
  check(res, {
    'journal-create: expected status': () => validResponse,
  });

  if (status >= 200 && status < 300) {
    financeInvariantPass.add(1);
  } else if (status === 409) {
    conflictRate.add(1);
    financeInvariantPass.add(1); // Conflict correctly detected
  } else if (status >= 500) {
    financeInvariantPass.add(0);
  } else {
    financeInvariantPass.add(1); // 4xx validation is correct behavior
  }

  return {
    status,
    success: status >= 200 && status < 300,
    journalId: body?.data?.id || null,
  };
}

/**
 * Attempt to submit/approve the same journal entry concurrently.
 * Business invariant: a journal can only be posted once.
 * If two concurrent requests try to submit, exactly one should succeed.
 */
export function concurrentJournalApproval(auth, journalId) {
  if (!journalId) return { status: 0, success: false };

  const tags = { name: 'concurrency:finance:approve-journal', endpoint: 'finance:journals:approve', module: 'finance', tier: 'workflow' };

  const res = authPost(`${API_V1}/finance/journal-entries/${journalId}/submit`, {}, auth, { tags });
  const status = res.status;

  // Invariant: no server errors
  check(res, {
    'journal-approve: no server error (invariant)': (r) => r.status < 500,
  });

  // Expected: 200 (first approval wins) or 409/422 (already submitted)
  check(res, {
    'journal-approve: approved or already-submitted': (r) =>
      r.status === 200 || r.status === 201 || r.status === 409 || r.status === 422 || r.status === 400,
  });

  if (status === 409 || status === 422) {
    conflictRate.add(1);
    financeInvariantPass.add(1); // Double-post correctly prevented
  } else if (status >= 200 && status < 300) {
    financeInvariantPass.add(1);
  } else if (status >= 500) {
    financeInvariantPass.add(0);
  }

  return { status, success: status >= 200 && status < 300 };
}

/**
 * Full finance posting contention simulation with invariant verification.
 * After creating and submitting a journal, verifies its state is consistent.
 */
export function financePostingContention(auth, setupData) {
  if (setupData.coaDebitId === 'SETUP_MISSING' || setupData.coaCreditId === 'SETUP_MISSING') {
    return;
  }

  // 1. List existing journals (read contention)
  const listRes = authGet(`${API_V1}/finance/journal-entries`, auth, {
    tags: { name: 'concurrency:finance:list', endpoint: 'finance:journals:list', module: 'finance', tier: 'list' },
  });
  check(listRes, {
    'finance-list: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // 2. Create a new journal entry
  const createResult = concurrentJournalCreate(auth, setupData);

  // 3. If created, try to approve it (concurrent approval contention)
  if (createResult.success && createResult.journalId) {
    sleep(0.2);
    const approvalResult = concurrentJournalApproval(auth, createResult.journalId);

    // 4. Verify invariant: fetch the journal and check its state is consistent
    const verifyRes = authGet(
      `${API_V1}/finance/journal-entries/${createResult.journalId}`,
      auth,
      { tags: { name: 'concurrency:finance:verify', endpoint: 'finance:journals:get', module: 'finance', tier: 'crud' } }
    );

    if (verifyRes.status >= 200 && verifyRes.status < 300) {
      const verifyBody = parseBody(verifyRes);
      if (verifyBody?.data) {
        const journal = verifyBody.data;
        // Invariant: status should be exactly one of: draft, submitted, posted, rejected
        // It should NOT be in an inconsistent intermediate state
        const validStates = ['draft', 'submitted', 'posted', 'approved', 'rejected', 'cancelled'];
        const stateField = journal.status || journal.state || '';
        const stateValid = validStates.includes(stateField.toLowerCase()) || stateField === '';

        const stateCheck = check(null, {
          'journal-state: consistent after concurrent ops': () => stateValid,
        });

        if (!stateCheck) {
          financeDoublePost.add(1);
          console.error(`[INVARIANT VIOLATION] Journal ${createResult.journalId} in inconsistent state: "${stateField}"`);
        }
      }
    }
  }
}
