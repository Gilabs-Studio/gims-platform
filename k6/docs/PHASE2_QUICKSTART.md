# Phase 2: CI/CD Integration - Quick Start

**Objective**: Catch performance regressions & bugs pre-merge via automated quality gates  
**Timeline**: 1–2 weeks (AFTER Phase 1.5)  
**Prerequisite**: Phase 1.5 (Enhanced Test Suite) must be complete and stable  
**Next Step**: Implementation details below

---

## ⚠️ IMPORTANT: Phase 1.5 is Required First

Phase 2 CI/CD gates are **only valuable** if they validate against comprehensive test coverage.

**Phase 1.5 includes:**
- Transaction scenarios (PO→GR, SO→Invoice, Journal, Attendance)
- Multi-tenant load distribution
- Concurrent mutation / FOR UPDATE testing
- Rate limiting validation
- Spike + soak test scripts

**Without Phase 1.5:**
- ❌ Gates catch only performance regressions, miss correctness bugs
- ❌ Race conditions + lost updates undetected until production
- ❌ Multi-tenant issues invisible

**See**: [K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md#phase-15-test-suite-enhancement---highest-priority---prerequisite) for Phase 1.5 details

---

## Big Picture

```
┌─────────────────────────────────────────────────────────┐
│                    PR/Release Events                      │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
    Pull Request          Push Tag (Release)
        │                    │
        ▼                    ▼
  ┌──────────────┐      ┌──────────────┐
  │  Smoke Test  │      │  Load Test   │
  │  (1 min)     │      │  (5 min)     │
  │  p95 <500ms  │      │  p95 <800ms  │
  └──────┬───────┘      └──────┬───────┘
         │                     │
    ┌────▼────┐           ┌────▼────┐
    │ PASS    │ FAIL      │ PASS    │ FAIL
    │         │           │         │
    │ Merge   │ Block PR  │ Release │ Block Tag
    │ OK      │           │ OK      │
    └─────────┘           └─────────┘
```

---

## What Gets Built

### 1. GitHub Actions Workflow
**File**: `.github/workflows/performance-gates.yml`

- Smoke test runs on every PR (< 2 min)
- Load test runs on version tags (< 6 min)
- Blocks merge/release if thresholds fail
- JSON report uploaded as artifact

### 2. Enhanced k6 Config
**File**: `k6/config.js` (additions)

- `CRITICAL_THRESHOLDS`: Stricter for CI (p95 <500ms smoke, <800ms load)
- `MODULE_SLOS`: Per-domain targets (finance p95 <200ms, etc.)
- `IS_CI`: Environment detection
- `STRICT_MODE`: Failure behavior control

### 3. Documentation
**File**: `k6/docs/CI-CD-INTEGRATION.md` (new)

- Setup instructions (GitHub secrets)
- Troubleshooting guide
- Regression investigation runbook
- Threshold tuning guidelines

---

## Implementation Checklist

### Step 1: GitHub Actions Setup (2–3 hours)
- [ ] Create `.github/workflows/performance-gates.yml`
- [ ] Add GitHub secrets (BASE_URL, TEST_EMAIL, TEST_PASSWORD)
- [ ] Test smoke gate on dev PR
- [ ] Validate load gate on staging tag

### Step 2: k6 Config Updates (1–2 hours)
- [ ] Add `CRITICAL_THRESHOLDS` to `k6/config.js`
- [ ] Define `MODULE_SLOS` for each domain
- [ ] Add `IS_CI` and `STRICT_MODE` env vars
- [ ] Validate with test run in CI environment

### Step 3: npm Scripts (30 min)
- [ ] Add `--threshold-abort-on-fail` flag to existing scripts
- [ ] Create `k6:smoke:ci` and `k6:load:ci` variants if needed
- [ ] Test locally with `K6_STRICT_MODE=1`

### Step 4: Documentation (2–3 hours)
- [ ] Write `k6/docs/CI-CD-INTEGRATION.md`
- [ ] Add troubleshooting section
- [ ] Document module SLOs with rationale
- [ ] Create performance regression investigation guide

### Step 5: Validation (2–3 hours)
- [ ] Run smoke test on real PR (verify gate works)
- [ ] Intentionally break threshold, verify block works
- [ ] Monitor CI/CD for flaky tests
- [ ] Team review + approval

---

## Success Criteria

✅ Smoke gate runs on every PR (<2 min overhead)  
✅ Load gate runs on release tags (<6 min overhead)  
✅ At least 1 real regression caught by gate  
✅ <5% false positive rate over 2 weeks  
✅ Team confident in automation (validated catch)  

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `.github/workflows/performance-gates.yml` | GitHub Actions workflow (NEW) |
| `k6/config.js` | Enhanced with CRITICAL_THRESHOLDS, MODULE_SLOS |
| `k6/docs/CI-CD-INTEGRATION.md` | Setup & troubleshooting guide (NEW) |
| `k6/smoke-test.js` | Unchanged (used as-is) |
| `k6/load-test.js` | Unchanged (used as-is) |
| `package.json` | `k6:smoke` and `k6:load:baseline` scripts (existing) |

---

## Module SLO Defaults (Starting Point)

Based on GIMS business criticality:

```javascript
const MODULE_SLOS = {
  'product': { p95: 100, error_rate: 0.5 },      // Critical: master data
  'sales': { p95: 150, error_rate: 0.5 },        // High: real-time dashboard
  'finance': { p95: 200, error_rate: 0.5 },      // Critical: month-end
  'inventory': { p95: 250, error_rate: 0.8 },    // Medium: frequent updates
  'purchase': { p95: 250, error_rate: 0.8 },     // Medium: PO throughput
  'hrd': { p95: 300, error_rate: 1.0 },          // Medium: batch processing OK
};
```

---

## Estimated Effort & Timeline

| Task | Effort | Timeline |
|------|--------|----------|
| GitHub Actions workflow | 2–3h | Day 1–2 |
| k6 config updates | 1–2h | Day 2–3 |
| Documentation | 2–3h | Day 3–4 |
| Testing & validation | 2–3h | Day 4–5 |
| **Total** | **8–11h** | **~1 week** |

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Flaky tests block PRs | Use RELAXED mode for local development, strict only in CI |
| Threshold too aggressive | Start with current baseline values, tune after 2 weeks |
| CI timeout too short | Allocate 10+ min timeout, fail gracefully if k6 process dies |
| GitHub quota exceeded | Use free tier (2K min/month = ~20 PRs/day, sufficient) |

---

## Next: Phase 3 (Preview)

After Phase 2 stabilizes (2+ weeks), begin Phase 3:
- Synthetic monitoring 24/7 from 3 regions
- Custom business KPI metrics
- Grafana dashboard + real-time alerts
- Expected effort: 3–4 weeks

---

**Document Version**: 1.0  
**Last Updated**: May 12, 2026  
**Status**: Ready for Implementation  
**Recommended Start**: Immediate (highest ROI)
