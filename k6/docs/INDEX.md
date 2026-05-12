# k6 Documentation Index

## Quick Navigation

## Agent Skills

- **k6 Skill**: User-level skill for implementing, documenting, and maintaining k6 transaction workflow tests. See `.agents/skills/k6/` and `../../README_SKILL.md` for details.

### 🏗 Clean Structure
- **[architecture/CLEAN_ARCHITECTURE_MAP.md](./architecture/CLEAN_ARCHITECTURE_MAP.md)**
  - Menjelaskan struktur folder dokumentasi berlapis
  - Menunjukkan pemetaan strategy, use case, dan infrastructure
  - Titik mulai terbaik untuk membaca dokumentasi baru

### 🧪 Use Cases
- **[use-cases/modules/MODULE_TRANSACTION_COVERAGE.md](./use-cases/modules/MODULE_TRANSACTION_COVERAGE.md)**
  - Ringkasan coverage workflow transaksi per modul
  - Menjelaskan mana yang implemented, partial, dan planned

- **[use-cases/TRANSACTION_TEST_DETAILED.md](./use-cases/TRANSACTION_TEST_DETAILED.md)**
  - Penjelasan paling detail tentang apa yang terjadi di `transaction-test.js`
  - Menjelaskan setup, helper, flow, concurrency check, dan failure modes
  - Dokumen utama untuk investigasi workflow Sales

- **[use-cases/modules/sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md](./use-cases/modules/sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md)**
  - Breakdown terperinci workflow transaksi modul Sales
  - Menjelaskan step per step dari SQ sampai confirm payment

- **[use-cases/modules/finance/FINANCE_TRANSACTION_COVERAGE.md](./use-cases/modules/finance/FINANCE_TRANSACTION_COVERAGE.md)**
  - Menjelaskan coverage Finance saat ini yang masih tidak langsung

- **[use-cases/modules/purchase/PURCHASE_TRANSACTION_WORKFLOW_PLANNED.md](./use-cases/modules/purchase/PURCHASE_TRANSACTION_WORKFLOW_PLANNED.md)**
  - Menjelaskan workflow Purchase yang direncanakan

- **[use-cases/modules/hrd/HRD_TRANSACTION_WORKFLOW_PLANNED.md](./use-cases/modules/hrd/HRD_TRANSACTION_WORKFLOW_PLANNED.md)**
  - Menjelaskan workflow HRD yang direncanakan

- **[use-cases/LOAD_TEST_DETAILED.md](./use-cases/LOAD_TEST_DETAILED.md)**
  - Menjelaskan traffic mix dan tujuan baseline load

- **[use-cases/STRESS_TEST_DETAILED.md](./use-cases/STRESS_TEST_DETAILED.md)**
  - Menjelaskan pattern pressure test dan arti abort-on-fail

- **[use-cases/SMOKE_TEST_DETAILED.md](./use-cases/SMOKE_TEST_DETAILED.md)**
  - Menjelaskan smoke gate dan arti hasilnya

### 🧱 Infrastructure
- **[infrastructure/FOUNDATION_COMPONENTS.md](./infrastructure/FOUNDATION_COMPONENTS.md)**
  - Menjelaskan `config.js`, `auth-helper.js`, benchmark policy, dan reports
  - Cocok untuk memahami komponen bersama yang dipakai semua script

### 📋 Strategic Planning & Requirements
- **[K6_PRD.md](./K6_PRD.md)** 📄 **OFFICIAL REQUIREMENTS**
  - Problem statement & business impact
  - Goals, objectives, stakeholder needs
  - Use cases & functional requirements (per phase)
  - Success metrics & acceptance criteria
  - Risk assessment & contingencies
  - *Official product requirements document for project sign-off*

- **[K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md)** ⭐ START HERE
  - Big picture vision (Phase 1–5)
  - Current state vs target state
  - Detailed phased implementation plan
  - Success metrics and risk assessment
  - *Read this first to understand the overall strategy*

### 🚀 Implementation (Current Phase)
- **[PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md)** 🔴 **NEXT ACTION**
  - Transaction scenarios (PO, SO, Journal, Attendance)
  - Multi-tenant load distribution
  - Concurrent mutation + rate limiting tests
  - Spike & soak test scripts
  - *Start here — Phase 1.5 blocks Phase 2*

### 🚀 Implementation (Phase 2)
- **[PHASE2_QUICKSTART.md](./PHASE2_QUICKSTART.md)** — After Phase 1.5
  - GitHub Actions workflow
  - CI/CD quality gates (smoke on PR, load on release)
  - Module SLOs & threshold tuning
  - *Use after Phase 1.5 is complete*

### 🧭 Implementation Reference
- **[K6_TEST_SUITE_ARCHITECTURE.md](./K6_TEST_SUITE_ARCHITECTURE.md)**
  - Struktur suite k6 saat ini
  - Hubungan antara fondasi, script skenario, artefak, dan roadmap
  - Cocok untuk memahami kenapa file tertentu ada di repo

- **[K6_FILE_PURPOSE_MAP.md](./K6_FILE_PURPOSE_MAP.md)**
  - Peta tujuan setiap file penting di `k6/`
  - Menjelaskan kapan file dipakai dan area ownership-nya
  - Cocok untuk onboarding engineer baru

- **[K6_EXECUTION_PLAYBOOK.md](./K6_EXECUTION_PLAYBOOK.md)**
  - Panduan menjalankan suite berdasarkan tujuan engineering
  - Menjelaskan kapan memakai smoke, load, stress, atau transaction
  - Cocok untuk QA, backend, dan perf investigation

### 📖 Detailed Guides (Coming Soon)
- `CI-CD-INTEGRATION.md` — GitHub Actions setup, secrets, troubleshooting
- `SYNTHETIC-MONITORING.md` — k6 Cloud, Grafana, Prometheus setup
- `CHAOS-ENGINEERING.md` — Fault injection, resilience testing scenarios
- `DISTRIBUTED-TESTING.md` — k6-operator, Kubernetes, multi-region

---

## Roadmap at a Glance

| Phase | Goal | Timeline | Status |
|-------|------|----------|--------|
| **Phase 1** | Baseline measurement & test suite | ✅ Complete | [k6/README.md](../README.md) |
| **Phase 1.5** | Enhanced test suite (transactions, multi-tenant) | 1–2 weeks | 🔴 **NEXT - START NOW** |
| **Phase 2** | CI/CD quality gates | 1–2 weeks after P1.5 | 🟡 After Phase 1.5 |
| **Phase 3** | Production observability | 2–3 weeks after P2 | 🟡 Planned |
| **Phase 4** | Resilience validation | 2–3 weeks after P3 | 🟡 Planned |
| **Phase 5** | Enterprise scale (distributed) | Q3 2026 | 🟡 Future |

---

## Where to Find What

### For Decision Makers
→ Read **[K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md)** (Executive Summary + Big Picture Goal)

### For Implementation Engineers
→ Start with **[architecture/CLEAN_ARCHITECTURE_MAP.md](./architecture/CLEAN_ARCHITECTURE_MAP.md)**  
→ Then **[use-cases/modules/MODULE_TRANSACTION_COVERAGE.md](./use-cases/modules/MODULE_TRANSACTION_COVERAGE.md)**  
→ Then **[use-cases/modules/sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md](./use-cases/modules/sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md)**  
→ Then **[infrastructure/FOUNDATION_COMPONENTS.md](./infrastructure/FOUNDATION_COMPONENTS.md)**

### For Team Training
→ Watch Phase 2 demo (link TBD)  
→ Read [../README.md](../README.md) (existing test suite overview)  
→ Reference execution flow in [K6_EXECUTION_PLAYBOOK.md](./K6_EXECUTION_PLAYBOOK.md)
→ Read detailed use cases in [use-cases/TRANSACTION_TEST_DETAILED.md](./use-cases/TRANSACTION_TEST_DETAILED.md)

### For Troubleshooting
→ CI/CD errors: `CI-CD-INTEGRATION.md` (coming soon)  
→ Test failures: [../README.md](../README.md), [K6_EXECUTION_PLAYBOOK.md](./K6_EXECUTION_PLAYBOOK.md), and [use-cases/TRANSACTION_TEST_DETAILED.md](./use-cases/TRANSACTION_TEST_DETAILED.md)  
→ Threshold questions: [../benchmark-matrix.md](../benchmark-matrix.md)

---

## Key Metrics (Phase 1 Baseline)

Reference for future comparisons:

```
Smoke Test (1 VU, 5 iter)
├─ p95 latency: 86.74ms
├─ error rate: 0%
├─ checks passed: 196/196
└─ duration: ~1 minute

Load Test Baseline (20 VU, 5 min)
├─ p95 latency: 79.87ms
├─ error rate: 0.0085%
├─ checks passed: 9,640/1
└─ duration: ~6 minutes

Load Test Peak (40 VU, 30 sec)
├─ p95 latency: 173.83ms
├─ error rate: 0.008%
├─ checks passed: 9,052/1
└─ duration: ~30 seconds

Stress Test (progressive ramp)
├─ p95 latency: 46.03ms (quick), 36.74ms (full)
├─ error rate: 0%
└─ breaking point: >60 VU (not reached in test window)

Soak Test (30 VU, 30 sec)
├─ p95 latency: 40.79ms
├─ error rate: 0%
└─ memory stability: ✓ validated
```

---

## File Structure

```
k6/
├── docs/                          # This directory
│   ├── K6_MATURITY_ROADMAP.md    # Strategic plan (Phases 1–5)
│   ├── PHASE2_QUICKSTART.md      # CI/CD implementation quick ref
│   ├── CI-CD-INTEGRATION.md      # (Coming: detailed setup)
│   ├── SYNTHETIC-MONITORING.md   # (Coming: production monitoring)
│   ├── CHAOS-ENGINEERING.md      # (Coming: resilience testing)
│   └── INDEX.md                  # This file
├── reports/                       # Baseline & benchmark results
│   ├── 20260512-012329-*.json    # JSON summaries (6 stages)
│   ├── 20260512-012329-baseline-report.md  # Markdown report
│   └── generate-baseline-report.js  # Report generator
├── README.md                      # Test suite overview & execution
├── benchmark-matrix.md            # SLO definitions & policy
├── config.js                      # Shared config, endpoints, thresholds
├── auth-helper.js                 # CSRF + JWT authentication
├── smoke-test.js                  # Quick validation test
├── load-test.js                   # Sustained load test
└── stress-test.js                 # Progressive stress ramp
```

---

## Decision Tree: Which Document to Read?

```
START
  │
  ├─ "Saya ingin dokumentasi detail sesuai struktur folder" → architecture/CLEAN_ARCHITECTURE_MAP.md
  │
  ├─ "Saya ingin tahu apa yang terjadi di transaction test" → use-cases/TRANSACTION_TEST_DETAILED.md
  │
  ├─ "Saya ingin detail flow transaksi per modul" → use-cases/modules/MODULE_TRANSACTION_COVERAGE.md
  │
  ├─ "Saya ingin detail penuh flow Sales" → use-cases/modules/sales/SALES_REVENUE_CYCLE_IMPLEMENTED.md
  │
  ├─ "Saya ingin tahu fondasi teknis yang dipakai semua script" → infrastructure/FOUNDATION_COMPONENTS.md
  │
  ├─ "Saya ingin tahu tujuan tiap file" → K6_FILE_PURPOSE_MAP.md
  │
  ├─ "Saya ingin paham struktur suite saat ini" → K6_TEST_SUITE_ARCHITECTURE.md
  │
  ├─ "Saya ingin tahu harus menjalankan script yang mana" → K6_EXECUTION_PLAYBOOK.md
  │
  ├─ "What's the big picture?" → K6_MATURITY_ROADMAP.md
  │
  ├─ "What should I do next?" → PHASE1.5_ENHANCED_TEST_SUITE.md (Phase 1.5 is next!)
  │
  ├─ "How do I set up GitHub Actions?" → PHASE2_QUICKSTART.md (after Phase 1.5)
  │
  ├─ "How do I run tests?" → ../README.md
  │
  ├─ "What are the SLOs?" → ../benchmark-matrix.md
  │
  └─ "I need full context" → K6_MATURITY_ROADMAP.md (comprehensive overview)
```

---

## Contact & Support

For questions about:
- **Strategy**: See K6_MATURITY_ROADMAP.md (Decision Gate section)
- **Suite architecture**: See K6_TEST_SUITE_ARCHITECTURE.md
- **File ownership/purpose**: See K6_FILE_PURPOSE_MAP.md
- **Execution choice**: See K6_EXECUTION_PLAYBOOK.md
- **Phase 2 setup**: See PHASE2_QUICKSTART.md (Checklist)
- **Test failures**: See ../README.md (Troubleshooting)
- **Threshold tuning**: See ../benchmark-matrix.md (SLO definitions)

---

**Last Updated**: May 12, 2026  
**Current Phase**: 1 (✅ Complete) → **Phase 1.5 (🔴 START NOW)**  
**Status**: Phase 1.5 planning complete, ready for implementation  

**👉 NEXT STEP**: Review [PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md) and start transaction test implementation
