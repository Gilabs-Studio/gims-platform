# Phase 1.5: Enhanced Test Suite - Quick Start

**Objective**: Strengthen test coverage to validate correctness & real-world ERP workflows  
**Timeline**: 1–2 weeks (IMMEDIATE - before Phase 2)  
**Blocker For**: Phase 2 CI/CD gates (gates depend on comprehensive coverage)  
**Next Step**: Implementation details below

---

## Why Phase 1.5 is Critical

### Current Test Suite Gaps

| Scenario | Current | Needed | Impact if Missing |
|----------|---------|--------|------------------|
| **Write Operations** | 5% CREATE | 30-40% writes | Miss race conditions, lost updates |
| **Multi-Tenant** | Single tenant | Round-robin 4 tenants | Tenant isolation bugs invisible |
| **Transactions** | No | PO→GR, SO→Invoice, Journal | Atomic transaction failures hidden |
| **Concurrency** | No | FOR UPDATE + conflict test | Deadlocks + 409 errors undetected |
| **Rate Limiting** | No | 429 response + reset | Service degradation unvalidated |
| **Spike Test** | No | 2x baseline ramp | Burst handling unknown |
| **Soak Test** | Partial | 60+ min validation | Memory leaks + connection issues |

### Reality Check
GIMS is an **ERP** - financial/inventory data integrity is critical. Load testing must validate **correctness** alongside performance.

**Example**: Load test shows 200 req/s, but 0.5% of transactions have lost updates → production loss of revenue/inventory accuracy.

---

## Big Picture

```
Phase 1 (Baseline)         Phase 1.5 (Enhanced)        Phase 2 (CI/CD)
─────────────────          ───────────────────         ──────────────
✅ Smoke/Load/Stress   +   Transaction scenarios   =   🔒 Production-Ready
✅ Single-tenant      +   Multi-tenant load       =   Quality Gates
✅ Mostly reads       +   Concurrency/locking     =   Safe to merge
                      +   Rate limit validation   
                      +   Spike + soak scripts    
```

---

## Implementation Checklist

### Phase 1.5 Tasks (2 weeks = 10 days)

#### Day 1–2: Transaction Test Suite Planning
- [ ] Meet with backend team to confirm transaction workflows
  - Purchase Order: CREATE → UPDATE status → Goods Receipt
  - Sales: SQ → SO → Delivery → Invoice (multi-step)
  - Finance: Journal Entry (atomic debit/credit)
  - HRD: Attendance Check-In (timezone-aware per company)
- [ ] Identify test data requirements per workflow
- [ ] Define success criteria (what constitutes "correct"?)

#### Day 3–4: Implement transaction-test.js
- [ ] Create `k6/transaction-test.js`
- [ ] Implement PO→GR workflow
- [ ] Implement SO→Invoice workflow
- [ ] Implement Journal Entry (verify debit/credit balance)
- [ ] Implement Attendance Check-In (test 2+ company timezones)
- [ ] Add validation checks (verify data in responses)
- [ ] Set thresholds: error_rate < 0.5%, p95 < 1000ms

#### Day 5–6: Multi-Tenant Load Distribution
- [ ] Create fixture with 4 test users (admin, supplier, customer, finance)
- [ ] Enhance `k6/load-test.js`:
  - [ ] Authenticate all users in setup()
  - [ ] Round-robin VU assignment to users
  - [ ] Verify each VU operates in correct tenant context
- [ ] Add check: verify isolation (finance sees own data only)
- [ ] Test: per-tenant rate limiting if applicable

#### Day 7–8: Concurrent Mutation & Rate Limiting Tests
- [ ] Create `k6/concurrent-mutation-test.js`:
  - [ ] 2 VUs update same product/customer simultaneously
  - [ ] Verify one gets lock, other gets 409/timeout
  - [ ] Check for lost updates (validate final state)
- [ ] Create `k6/rate-limit-test.js`:
  - [ ] Ramp up to hit Redis rate limit
  - [ ] Verify 429 response structure
  - [ ] Validate rate limit reset timing
  - [ ] Test cascading backoff

#### Day 9–10: Spike & Soak Scripts
- [ ] Create `k6/spike-test.js` (from SPIKE_WORKLOAD in config.js)
  - [ ] Ramp to 2x baseline load (40 VU)
  - [ ] Hold for 1 min
  - [ ] Check: no cascading failures
- [ ] Create `k6/soak-test.js` (from SOAK_WORKLOAD in config.js)
  - [ ] 30 VU sustained for 60+ minutes
  - [ ] Monitor: memory stability, connection pool, CPU
  - [ ] Check: <1% error rate, 0 memory leaks
- [ ] Add npm scripts for both

**Day 10**: Testing + npm script integration

---

## Test Files to Create

### 1. k6/transaction-test.js (NEW)

```javascript
// Purpose: Validate multi-step business transactions
// Scenarios:
//   - Purchase Order creation → receipt
//   - Sales Quote → Order → Delivery → Invoice
//   - Journal Entry (debit/credit atomic)
//   - Attendance Check-in (per-company timezone)
// Threshold: error_rate < 0.5% (transactions critical)

import http from 'k6/http';
import { check, group } from 'k6';
import { getAuthToken, authGet, authPost } from './auth-helper.js';

// [Implementation details in actual file]
```

### 2. k6/concurrent-mutation-test.js (NEW)

```javascript
// Purpose: Validate FOR UPDATE locking, detect lost updates
// Scenarios:
//   - 2 VUs update same product simultaneously
//   - 2 VUs update same customer simultaneously
//   - Verify lock behavior (409 Conflict, retry success)
// Threshold: 0 lost updates (integrity critical)
```

### 3. k6/rate-limit-test.js (NEW)

```javascript
// Purpose: Validate Redis rate limiting behavior
// Scenarios:
//   - Ramp up to exceed rate limit
//   - Verify 429 response (if rate limited)
//   - Validate rate limit reset
//   - Test cascading failure scenarios
```

### 4. k6/spike-test.js (NEW)

```javascript
// Purpose: Validate system handles 2x load spike
// Scenario: Ramp from 1 VU → 40 VU → back to 1 VU
// Duration: ~2 minutes
// Threshold: error_rate < 1%, p95 < 1000ms
```

### 5. k6/soak-test.js (NEW)

```javascript
// Purpose: Validate system stability under sustained load
// Scenario: 30 VUs sustained for 60+ minutes
// Monitoring: Memory, connections, GC pauses
// Threshold: error_rate < 1%, 0 memory leaks
```

### 6. k6/load-test.js (ENHANCED)

```javascript
// Add multi-tenant support:
// - Credential array with 4 test users
// - Setup() authenticates all users
// - VU loop: round-robin user selection
// - Add check: verify tenant isolation
```

---

## Module SLO Defaults for Phase 1.5

```javascript
const PHASE_1_5_SLOS = {
  // Transactions: stricter than normal operations
  'transaction': { p95: 500, error_rate: 0.5 },  // PO, SO, Journal
  
  // Multi-tenant: per-tenant isolation
  'multi_tenant': { p95: 300, error_rate: 1.0 }, // Slight overhead OK
  
  // Concurrency: timeouts expected, but <5%
  'concurrent': { p95: 2000, error_rate: 5.0 },  // Some 409s expected
  
  // Rate limiting: must return 429, not 500
  'rate_limit': { p95: 100, error_rate: 0 },     // 429 not counted as error
  
  // Spike: similar to baseline, slight bump OK
  'spike': { p95: 500, error_rate: 1.0 },
  
  // Soak: long-term stability
  'soak': { p95: 300, error_rate: 0.5 },
};
```

---

## npm Scripts to Add

Add to `package.json`:

```json
{
  "scripts": {
    "k6:transaction": "k6 run k6/transaction-test.js",
    "k6:concurrent": "k6 run k6/concurrent-mutation-test.js",
    "k6:rate-limit": "k6 run k6/rate-limit-test.js",
    "k6:spike": "k6 run k6/spike-test.js",
    "k6:soak": "k6 run k6/soak-test.js",
    "k6:soak:extended": "k6 run -e DURATION=3600s k6/soak-test.js",
    
    "k6:phase1.5": "pnpm k6:transaction && pnpm k6:concurrent && pnpm k6:rate-limit && pnpm k6:spike && pnpm k6:soak"
  }
}
```

---

## Testing Strategy

### Local Validation (During Development)
```bash
# Single test at a time
pnpm k6:transaction
pnpm k6:concurrent
pnpm k6:rate-limit
pnpm k6:spike
pnpm k6:soak
```

### Full Phase 1.5 Validation (Before Phase 2)
```bash
# Run all tests to confirm stable
pnpm k6:phase1.5

# Expected output:
# ✅ transaction-test: passes
# ✅ concurrent-mutation-test: passes (some 409s expected)
# ✅ rate-limit-test: passes (validates 429 behavior)
# ✅ spike-test: passes (recovers from 2x load)
# ✅ soak-test: passes (60 min, 0 leaks)
```

---

## Success Criteria

- [ ] Transaction workflows execute end-to-end without errors
- [ ] Multi-tenant tests validate per-tenant isolation (no data leakage)
- [ ] Concurrent mutation tests confirm FOR UPDATE behavior
- [ ] Rate limiting tests validate 429 response + reset timing
- [ ] Spike test handles 2x load, recovers gracefully
- [ ] Soak test runs 60+ min with <1% error rate, 0 memory leaks
- [ ] All tests integrated into npm scripts
- [ ] <3% false positive rate (stable thresholds over 2-week period)
- [ ] Backend team validates test scenarios are realistic

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Tests find bugs in transactions | ✅ Expected! Budget time to fix (this is the point) |
| Multi-tenant tests reveal isolation issues | ✅ Fix before Phase 2; add test to prevent regression |
| Concurrent tests hit many lock conflicts | Adjust VU count if needed; validate expected behavior |
| Rate limit tests are flaky | Conservative ramp-up; validate Redis is actually limiting |
| Soak test OOMs | Monitor memory, reduce VU count if needed |

---

## Estimated Effort & Timeline

| Task | Duration | Effort |
|------|----------|--------|
| Transaction test | Days 3-4 | 8h |
| Multi-tenant enhancement | Days 5-6 | 6h |
| Concurrent + rate limit | Days 7-8 | 8h |
| Spike + soak scripts | Days 9-10 | 4h |
| Testing & validation | Day 10 | 4h |
| **Total** | **~2 weeks** | **~30h** |

---

## Next: Phase 2 (After Phase 1.5)

Once Phase 1.5 is stable (2-week validation), proceed to Phase 2:
- GitHub Actions workflow (smoke on PR, load on release)
- Module-level SLOs
- CI/CD quality gates

See: [PHASE2_QUICKSTART.md](./PHASE2_QUICKSTART.md)

---

**Document Version**: 1.0  
**Last Updated**: May 12, 2026  
**Status**: Ready for Implementation  
**Recommended Start**: Immediate (highest priority - unblocks Phase 2)
